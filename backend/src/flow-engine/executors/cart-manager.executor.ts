import { Injectable, Logger } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';

interface CartItem {
  itemIndex: number;
  itemId: number | string;
  itemName: string;
  quantity: number;
  price: number;
  rawPrice?: number;
  storeId?: number;
  moduleId?: number;
  storeName?: string;
  storeLat?: number;
  storeLng?: number;
}

/**
 * Cart Manager Executor
 * 
 * Handles cart operations with single-store validation.
 * Currently, users can only order from one restaurant at a time.
 * 
 * Operations:
 * - add: Add items to cart (validates same store)
 * - remove: Remove item from cart
 * - clear: Clear entire cart
 * - validate: Check if cart is valid for checkout
 */
@Injectable()
export class CartManagerExecutor implements ActionExecutor {
  readonly name = 'cart_manager';
  private readonly logger = new Logger(CartManagerExecutor.name);

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const operation = config.operation || 'add';
      
      switch (operation) {
        case 'add':
          return this.addToCart(config, context);
        case 'remove':
          return this.removeFromCart(config, context);
        case 'clear':
          return this.clearCart(context);
        case 'validate':
          return this.validateCart(config, context);
        default:
          return {
            success: false,
            error: `Unknown cart operation: ${operation}`,
            event: 'error',
          };
      }
    } catch (error) {
      this.logger.error(`Cart operation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        event: 'error',
      };
    }
  }

  /**
   * Add items to cart with single-store validation
   */
  private addToCart(config: any, context: FlowContext): ActionExecutionResult {
    // Get new items to add
    const newItemsPath = config.newItemsPath || 'selection_result.selectedItems';
    const newItems = this.getNestedValue(context.data, newItemsPath) as CartItem[];
    
    if (!newItems || !Array.isArray(newItems) || newItems.length === 0) {
      return {
        success: false,
        error: 'No items to add to cart',
        event: 'no_items',
      };
    }

    // Get existing cart items
    const existingCart = (context.data.cart_items as CartItem[]) || [];
    
    // Determine the current store ID (from existing cart or new items)
    const currentStoreId = existingCart.length > 0 
      ? existingCart[0].storeId 
      : newItems[0].storeId;
    
    const currentStoreName = existingCart.length > 0 
      ? existingCart[0].storeName 
      : newItems[0].storeName;

    // Check if new items are from the same store
    const differentStoreItems = newItems.filter(item => 
      item.storeId && currentStoreId && item.storeId !== currentStoreId
    );

    if (differentStoreItems.length > 0) {
      // Items from different store - warn user
      const newStoreName = differentStoreItems[0].storeName || 'another restaurant';
      
      this.logger.warn(`Cart store conflict: existing=${currentStoreName} (${currentStoreId}), new=${newStoreName} (${differentStoreItems[0].storeId})`);
      
      return {
        success: false,
        output: {
          conflictingItems: differentStoreItems,
          currentStoreId,
          currentStoreName,
          newStoreId: differentStoreItems[0].storeId,
          newStoreName,
          message: `You already have items from ${currentStoreName || 'another restaurant'}. Would you like to clear your cart and start fresh with ${newStoreName}?`,
        },
        event: 'store_conflict',
      };
    }

    // Filter items that are from the same store (or have no store ID - backwards compat)
    const validItems = newItems.filter(item => 
      !item.storeId || !currentStoreId || item.storeId === currentStoreId
    );

    // Merge items - update quantities for existing items or add new ones
    const updatedCart = [...existingCart];
    
    for (const newItem of validItems) {
      const existingIndex = updatedCart.findIndex(
        item => item.itemId === newItem.itemId
      );
      
      if (existingIndex >= 0) {
        // Update quantity of existing item
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          quantity: updatedCart[existingIndex].quantity + newItem.quantity,
        };
        this.logger.debug(`Updated quantity: ${newItem.itemName} now has ${updatedCart[existingIndex].quantity}`);
      } else {
        // Add new item
        updatedCart.push(newItem);
        this.logger.debug(`Added to cart: ${newItem.itemName} x${newItem.quantity}`);
      }
    }

    // Calculate total
    const totalPrice = updatedCart.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
    const totalItems = updatedCart.reduce(
      (sum, item) => sum + item.quantity, 
      0
    );

    // Build cart summary message
    const cartSummary = this.buildCartSummary(updatedCart, totalPrice);

    this.logger.log(`🛒 Cart updated: ${updatedCart.length} unique items, ${totalItems} total quantity, ₹${totalPrice}`);

    return {
      success: true,
      output: {
        cart_items: updatedCart,
        selected_items: updatedCart, // For backwards compatibility
        totalPrice,
        totalItems,
        storeId: currentStoreId,
        storeName: currentStoreName,
        cartSummary,
        itemsAdded: validItems.length,
      },
      event: 'items_added',
    };
  }

  /**
   * Remove item from cart by itemId or index
   */
  private removeFromCart(config: any, context: FlowContext): ActionExecutionResult {
    const existingCart = (context.data.cart_items as CartItem[]) || [];
    const itemId = config.itemId;
    const itemIndex = config.itemIndex;

    if (existingCart.length === 0) {
      return {
        success: true,
        output: {
          cart_items: [],
          message: 'Cart is already empty',
        },
        event: 'cart_empty',
      };
    }

    let updatedCart: CartItem[];
    let removedItem: CartItem | undefined;

    if (itemId !== undefined) {
      removedItem = existingCart.find(item => item.itemId === itemId);
      updatedCart = existingCart.filter(item => item.itemId !== itemId);
    } else if (itemIndex !== undefined) {
      removedItem = existingCart[itemIndex];
      updatedCart = existingCart.filter((_, idx) => idx !== itemIndex);
    } else {
      return {
        success: false,
        error: 'No itemId or itemIndex provided for removal',
        event: 'error',
      };
    }

    const totalPrice = updatedCart.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );

    return {
      success: true,
      output: {
        cart_items: updatedCart,
        selected_items: updatedCart,
        totalPrice,
        removedItem,
        message: removedItem 
          ? `Removed ${removedItem.itemName} from cart` 
          : 'Item not found in cart',
      },
      event: updatedCart.length > 0 ? 'item_removed' : 'cart_empty',
    };
  }

  /**
   * Clear entire cart
   */
  private clearCart(context: FlowContext): ActionExecutionResult {
    this.logger.log('🗑️ Clearing cart');
    
    return {
      success: true,
      output: {
        cart_items: [],
        selected_items: [],
        totalPrice: 0,
        totalItems: 0,
        message: 'Cart cleared successfully',
      },
      event: 'cart_cleared',
    };
  }

  /**
   * Validate cart for checkout
   */
  private validateCart(config: any, context: FlowContext): ActionExecutionResult {
    const cart = (context.data.cart_items as CartItem[]) || [];

    if (cart.length === 0) {
      return {
        success: true,
        output: {
          valid: false,
          message: 'Your cart is empty. Please add some items first.',
        },
        event: 'cart_empty',
      };
    }

    // Check all items are from same store
    const storeIds = [...new Set(cart.map(item => item.storeId).filter(Boolean))];
    if (storeIds.length > 1) {
      return {
        success: true,
        output: {
          valid: false,
          message: 'Your cart has items from multiple restaurants. Please remove items to order from one restaurant only.',
        },
        event: 'multi_store_error',
      };
    }

    // Check minimum order amount if configured
    const minOrderAmount = config.minOrderAmount || 0;
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (totalPrice < minOrderAmount) {
      return {
        success: true,
        output: {
          valid: false,
          totalPrice,
          minOrderAmount,
          message: `Minimum order amount is ₹${minOrderAmount}. Your current total is ₹${totalPrice}.`,
        },
        event: 'below_minimum',
      };
    }

    return {
      success: true,
      output: {
        valid: true,
        cart_items: cart,
        totalPrice,
        totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
        storeId: storeIds[0],
        message: 'Cart is ready for checkout',
      },
      event: 'cart_valid',
    };
  }

  /**
   * Build user-friendly cart summary
   */
  private buildCartSummary(cart: CartItem[], totalPrice: number): string {
    if (cart.length === 0) {
      return 'Your cart is empty.';
    }

    const lines: string[] = ['🛒 **Your Cart**\n'];
    
    const storeName = cart[0]?.storeName;
    if (storeName) {
      lines.push(`📍 From: ${storeName}\n`);
    }
    
    for (const item of cart) {
      const itemTotal = item.price * item.quantity;
      lines.push(`• ${item.quantity}x ${item.itemName} - ₹${itemTotal.toFixed(0)}`);
    }
    
    lines.push(`\n**Total: ₹${totalPrice.toFixed(0)}**`);
    
    return lines.join('\n');
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}
