import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChatWidget from '../components/chat/ChatWidget';
import { chatAPI } from '../lib/apiClient';

vi.mock('../lib/apiClient', () => ({ chatAPI: { status: vi.fn(), send: vi.fn() } }));
vi.mock('../context/CartContext', () => ({ useCart: () => ({ cart: [], addToCart: vi.fn() }) }));

beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(chatAPI.status).mockResolvedValue({ data: { data: { enabled: true } } } as any);
    vi.mocked(chatAPI.send).mockResolvedValue({ data: { data: {
        sessionId: 'session-one', reply: 'No matches. We can try a broader search.', cards: [], actions: [],
        suggestions: ['Show me what is available instead', 'Explore the store categories'],
    } } } as any);
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
});

afterEach(() => vi.restoreAllMocks());

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
