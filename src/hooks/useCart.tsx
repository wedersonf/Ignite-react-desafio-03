import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });


  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if(!stock) {
        throw new Error(`Falha ao adicionar produto`)
      }

      if(stock.amount <= 0 ) {
        throw new Error(`Quantidade solicitada fora de estoque`)
      }

      const productExist = cart.find(prod => prod.id === productId);
      
      if (productExist) {
        if (productExist.amount >= stock.amount) {
          throw new Error('Quantidade solicitada fora de estoque');
        }

        const cartAtt = cart.map(prod => prod.id === productId
          ? {...prod, amount: prod.amount + 1 }
          : prod
        )

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartAtt))
        setCart(cartAtt);
      } else {
        const response = await api.get<Product>(`products/${productId}`);
        
        if (!response.data) {
          throw new Error('Erro na adição do produto');
        }

        if (stock.amount < 1) {
          throw new Error('Quantidade solicitada fora de estoque');
        }

        const { id, title, price, image } = response.data;

        const newProduct = {
          id,
          title,
          price,
          image,
          amount: 1,
        }
        
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, newProduct]))
        setCart([...cart, newProduct]);
      }
      
    } catch(error) {
      if (error.response) {
        toast.error('Erro na adição do produto');
      }
      toast.error(error.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(p => p.id === productId);

      if(!product) {
        throw new Error('Erro na remoção do produto');
      }

      const productRemoved = cart.filter(p => p.id !== productId);

      if(!productRemoved) {
        throw new Error('Erro na remoção do produto')
      }

      setCart(productRemoved)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productRemoved));
    } catch(error) {
      toast.error(error.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get(`stock/${productId}`);

      if(stock.amount < amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      if(amount < 1) {
        throw new Error('Quantidade é menor que 1');
      }
  

      const AttProduct = cart.map(p => p.id === productId
        ? {...p, amount}
        : p
      );

      setCart(AttProduct);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(AttProduct));
    } catch(error) {
      if(error.response) {
        toast.error('Erro na alteração de quantidade do produto')
      }
      toast.error(error.message)
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
