import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminProductAssistant from '../components/admin/AdminProductAssistant';
import { api } from '../lib/apiClient';

vi.mock('../lib/apiClient', () => ({ api: { post: vi.fn() } }));
const draft = { name: 'Navy shirt', size: 'M', color: 'Navy', price: 1299, quantity: 20, description: 'Cotton shirt' };
beforeEach(() => vi.clearAllMocks());
function open() { fireEvent.click(screen.getByRole('button', { name: 'AI product assistant' })); }
function send(value: string) {
    fireEvent.change(screen.getByLabelText('Describe your product'), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Send product message' }));
}

it('continues a conversation, offers approval only for a complete draft, and passes fields for review without saving', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { reply: 'Which size?', draft: { name: 'Navy shirt' }, ready: false, missingFields: ['size'] } } });
    const onReview = vi.fn();
    render(<AdminProductAssistant onReview={onReview} />); open(); send('Navy cotton shirt');
    await screen.findByText('Which size?');
    expect(screen.queryByRole('button', { name: 'Approve & review product' })).not.toBeInTheDocument();
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { reply: 'Ready to review.', draft, ready: true, missingFields: [] } } });
    send('Size M, 1299 rupees, 20 pieces');
    fireEvent.click(await screen.findByRole('button', { name: 'Approve & review product' }));
    expect(onReview).toHaveBeenCalledWith(draft);
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.post).mock.calls[1][1]).toEqual({ messages: [
        { role: 'user', content: 'Navy cotton shirt' }, { role: 'assistant', content: 'Which size?' },
        { role: 'user', content: 'Size M, 1299 rupees, 20 pieces' },
    ] });
});

it('keeps failed messages retryable and removes approval while a revision is pending', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { reply: 'Ready.', draft, ready: true, missingFields: [] } } });
    render(<AdminProductAssistant onReview={vi.fn()} />); open(); send('Create a shirt');
    await screen.findByRole('button', { name: 'Approve & review product' });
    vi.mocked(api.post).mockRejectedValueOnce({ response: { data: { message: 'AI unavailable' } } });
    send('Change price to 999');
    expect(screen.queryByRole('button', { name: 'Approve & review product' })).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('AI unavailable');
    expect(screen.getByLabelText('Describe your product')).toHaveValue('Change price to 999');
    fireEvent.click(screen.getByRole('button', { name: 'Start new product draft' }));
    await waitFor(() => expect(screen.getByLabelText('Describe your product')).toHaveValue(''));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('uploads photos to R2, sends them to the AI, and carries the same images into review', async () => {
    const url = 'https://media.example.test/products/assistant/photo.png';
    const withImages = { ...draft, photo: url, photos: [url] };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { url } } });
    const onReview = vi.fn();
    render(<AdminProductAssistant onReview={onReview} />); open();
    fireEvent.change(screen.getByLabelText('Upload product photos'), { target: { files: [new File(['image'], 'shirt.png', { type: 'image/png' })] } });
    expect(await screen.findByAltText('Product reference 1')).toHaveAttribute('src', url);
    const [endpoint, body] = vi.mocked(api.post).mock.calls[0];
    expect(endpoint).toBe('/admin/product-assistant/images');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBeInstanceOf(File);
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { reply: 'Ready from photos.', draft: withImages, ready: true, missingFields: [] } } });
    fireEvent.click(screen.getByRole('button', { name: 'Send product message' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve & review product' }));
    expect(vi.mocked(api.post).mock.calls[1][1]).toMatchObject({ images: [url] });
    expect(onReview).toHaveBeenCalledWith(withImages);
});

it('keeps successful attachments after a partial upload failure and detaches without deleting R2 files', async () => {
    const url = 'https://media.example.test/products/assistant/photo.png';
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { url } } }).mockRejectedValueOnce(new Error('offline'));
    render(<AdminProductAssistant onReview={vi.fn()} />); open();
    fireEvent.change(screen.getByLabelText('Upload product photos'), { target: { files: [
        new File(['first'], 'front.png', { type: 'image/png' }), new File(['second'], 'back.png', { type: 'image/png' }),
    ] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Already uploaded images are kept');
    expect(screen.getByAltText('Product reference 1')).toHaveAttribute('src', url);
    fireEvent.click(screen.getByRole('button', { name: 'Detach image 1' }));
    expect(screen.queryByAltText('Product reference 1')).not.toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(2);
});
