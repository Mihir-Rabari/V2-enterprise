export const SHOPPING_CHAT_LAUNCH_EVENT = 'v2:shopping-chat-launch';

export interface ShoppingChatLaunch {
    prompt: string;
    sendImmediately?: boolean;
}

/** Open the shared shopping assistant with an optional product-aware first message. */
export const launchShoppingChat = (detail: ShoppingChatLaunch): void => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<ShoppingChatLaunch>(SHOPPING_CHAT_LAUNCH_EVENT, { detail }));
};
