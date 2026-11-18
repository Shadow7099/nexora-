/**
 * Cálculo de un renglón de venta, compartido por el servidor (lo que se
 * guarda) y la pantalla (lo que se ve mientras se arma la venta).
 * Precios ANTES de IVA; subtotal = cantidad × precio − descuento;
 * IVA = subtotal × tarifa; redondeo al peso.
 */
const peso = (n: number) => Math.round(Math.round(n * 1000) / 1000);

export function computeLine(quantity: number, unitPrice: number, discount: number, taxRate: number) {
  const gross = quantity * unitPrice;
  const subtotal = peso(gross - discount);
  const tax = peso((subtotal * taxRate) / 100);
  return { gross: peso(gross), subtotal, tax, total: subtotal + tax };
}

export const saleNumber = (n: number) => `V-${String(n).padStart(6, "0")}`;
