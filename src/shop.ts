import { productById, products } from './data.ts';
export type CartItem = { id: string; variant: number; quantity: number };
export type Delivery = 'courier' | 'point' | 'studio';
export const itemKey = (item: Pick<CartItem,'id'|'variant'>) => `${item.id}:${item.variant}`;
export function normalizeCart(raw: unknown): CartItem[] {
 if (!Array.isArray(raw)) return [];
 const result: CartItem[] = [];
 for (const value of raw) {
  if (!value || typeof value !== 'object') continue;
  const p=productById(value.id), v=p?.variants[value.variant];
  if (!v || !Number.isInteger(value.variant) || !Number.isFinite(value.quantity) || v.stock<1) continue;
  const quantity=Math.min(v.stock,Math.max(1,Math.floor(value.quantity)));
  const found=result.find(i=>itemKey(i)===itemKey(value));
  if(found) found.quantity=Math.min(v.stock,found.quantity+quantity);
  else result.push({id:p!.id,variant:value.variant,quantity});
 }
 return result;
}
export function readStored(key: string): unknown { try { return JSON.parse(localStorage.getItem(key)||'null'); } catch { return null; } }
export function unitPrice(item: CartItem) { const p=productById(item.id)!;return p.price+p.variants[item.variant].extra; }
export const subtotal = (cart: CartItem[]) => cart.reduce((sum,item)=>sum+unitPrice(item)*item.quantity,0);
export function shipping(amount:number,delivery:Delivery) { return amount===0 || delivery==='studio' || amount>=8000 ? 0 : delivery==='courier'?490:290; }
export function filterProducts(query:string,category:string,max:number,sort:string) {
 const term=query.trim().toLocaleLowerCase('ru');
 const result=products.filter(p=>(!term || `${p.name} ${p.color} ${p.description}`.toLocaleLowerCase('ru').includes(term)) && (!category||p.category===category) && p.price<=max);
 return sort==='low'?result.sort((a,b)=>a.price-b.price):sort==='high'?result.sort((a,b)=>b.price-a.price):sort==='name'?result.sort((a,b)=>a.name.localeCompare(b.name,'ru')):result;
}
export type Contacts = { name:string; email:string; phone:string; city:string; address:string };
export function validateContacts(c:Contacts,delivery:Delivery) {
 const errors: Partial<Record<keyof Contacts,string>>={};
 if(c.name.trim().length<2) errors.name='Укажите имя — минимум 2 буквы.';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) errors.email='Введите email в формате name@example.ru.';
 const digits=c.phone.replace(/\D/g,'');
 if(digits.length<10||digits.length>15) errors.phone='Введите телефон: от 10 до 15 цифр.';
 if(delivery!=='studio') { if(c.city.trim().length<2) errors.city='Укажите город.'; if(c.address.trim().length<5) errors.address=delivery==='point'?'Укажите адрес пункта выдачи.':'Укажите улицу, дом и квартиру.'; }
 return errors;
}
