import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChatWidget from '../components/chat/ChatWidget';
import { chatAPI } from '../lib/apiClient';
import { SHOPPING_CHAT_LAUNCH_EVENT } from '../lib/chatEvents';

vi.mock('../lib/apiClient', () => ({ chatAPI: { status: vi.fn(), send: vi.fn() } }));
vi.mock('../context/CartContext', () => ({ useCart: () => ({ cart: [], addToCart: vi.fn() }) }));

beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    sessionStorage.clear();
    vi.mocked(chatAPI.status).mockResolvedValue({ data: { data: { enabled: true } } } as any);
    vi.mocked(chatAPI.send).mockResolvedValue({ data: { data: {
        sessionId: 'session-one', reply: 'No matches. We can try a broader search.', cards: [], actions: [],
        suggestions: ['Show me what is available instead', 'Explore the store categories'],
    } } } as any);
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('shows shuffled starters and sends follow-up chips as the next message in the same session', async () => {
    render(<ChatWidget />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open shopping assistant' }));
    const starters = within(screen.getByLabelText('Suggested prompts')).getAllByRole('button');
    expect(starters).toHaveLength(4); // Three prompts plus New ideas.
    expect(screen.queryByText('Linen for warm days')).not.toBeInTheDocument();
    fireEvent.click(starters[1]);
    const followUp = await screen.findByRole('button', { name: 'Show me what is available instead' });
    expect(screen.getByText('Where to next?')).toBeInTheDocument();
    fireEvent.click(followUp);
    await waitFor(() => expect(chatAPI.send).toHaveBeenLastCalledWith({
        sessionId: 'session-one', message: 'Show me what is available instead', cart: [],
    }));
    expect(chatAPI.send).toHaveBeenCalledTimes(2);
});

it('restores follow-ups from the saved conversation', async () => {
    sessionStorage.setItem('v2_chat', JSON.stringify({ sessionId: 'saved', messages: [
        { role: 'user', text: 'Any options?' },
        { role: 'assistant', text: 'Let us explore.', suggestions: ['Explore the store categories'] },
    ] }));
    render(<ChatWidget />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open shopping assistant' }));
    expect(await screen.findByRole('button', { name: 'Explore the store categories' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Shuffle suggested prompts' })).not.toBeInTheDocument();
});

it('keeps the mobile chat in the visual viewport and restores page scrolling on close', async () => {
    vi.stubGlobal('innerWidth', 390);
    const viewport = Object.assign(new EventTarget(), { height: 700, offsetTop: 0 });
    vi.stubGlobal('visualViewport', viewport);
    const { container } = render(<ChatWidget />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open shopping assistant' }));
    const dialog = screen.getByRole('dialog', { name: 'Shopping assistant' });
    expect(container.querySelector('[role="dialog"]')).toBeNull(); // Portaled out of page transforms.
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.overflow).toBe('hidden');
    expect(dialog).toHaveStyle({ height: '700px' });
    viewport.height = 400; viewport.offsetTop = 15;
    act(() => { viewport.dispatchEvent(new Event('resize')); });
    await waitFor(() => expect(dialog).toHaveStyle({ height: '400px', top: '15px' }));
    expect(dialog.querySelector('[aria-live="polite"]')).toHaveClass('overscroll-contain');
    fireEvent.click(screen.getByRole('button', { name: 'Close assistant' }));
    expect(document.body.style.position).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(window.scrollTo).toHaveBeenCalled();
});

it('sends a product-page launch prompt once and shows the first reply', async () => {
    render(<ChatWidget />);
    await screen.findByRole('button', { name: 'Open shopping assistant' });
    fireEvent(window, new CustomEvent(SHOPPING_CHAT_LAUNCH_EVENT, { detail: { prompt: 'Tell me about this shirt', sendImmediately: true } }));
    expect(await screen.findByText('No matches. We can try a broader search.')).toBeInTheDocument();
    expect(chatAPI.send).toHaveBeenCalledTimes(1);
    expect(chatAPI.send).toHaveBeenCalledWith({ sessionId: undefined, message: 'Tell me about this shirt', cart: [] });
});

it('ignores an old reply after starting a new conversation', async () => {
    let complete!: (value: any) => void;
    vi.mocked(chatAPI.send).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    render(<ChatWidget />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open shopping assistant' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Old question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start a new chat' }));
    complete({ data: { data: { sessionId: 'old', reply: 'Old response', cards: [], actions: [] } } });
    await waitFor(() => expect(screen.getByLabelText('Suggested prompts')).toBeInTheDocument());
    expect(screen.queryByText('Old response')).not.toBeInTheDocument();
});

it('keeps the message retryable when the server returns an empty response', async () => {
    vi.mocked(chatAPI.send).mockResolvedValueOnce({ data: { data: { sessionId: 'new', reply: '' } } } as any);
    render(<ChatWidget />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open shopping assistant' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Find jeans' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Find jeans');
});
