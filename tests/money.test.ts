import { test } from 'node:test';
import assert from 'node:assert/strict';
import { truncateDecimal, commission, sumMoney, financialFields } from '../src/money';
test('truncamiento decimal exacto, incluido signo y notación exponencial', () => {
  for (const [input, expected] of [['1.999',1.99],['-1.999',-1.99],['1.13',1.13],['0.009',0],['1.999e2',199.9],['0.0000001',0]] as const) assert.equal(truncateDecimal(input),expected);
  for (const input of ['Infinity','NaN','12abc']) assert.throws(() => truncateDecimal(input));
});
test('bono se trunca, nunca se redondea, con centavos enteros', () => {
  assert.equal(commission(100.99,0.015),1.51);
  assert.equal(commission(199.99,0.015),2.99);
  assert.equal(commission(1.13,1),1.13);
  assert.equal(sumMoney(Array(1000).fill(0.01)),10);
  assert.equal(sumMoney([0.1,0.2]),0.3);
  assert.throws(() => commission(10,2));
});
test('representación en centavos consistente y pago no genera saldo adicional', () => {
  const f=financialFields(199.999,0.015,'Aprobada');
  assert.equal(f.montoAprobado,199.99);assert.equal(f.bonoGenerado,2.99);assert.equal(f.bonoPagableCentavos,299);
  assert.equal(financialFields(199.99,0.015,'Aprobada',true).bonoPagable,0);
  assert.equal(financialFields(null,null,'Pendiente').bonoPagable,0);
});

import {parseCurrencyInput,parsePercentageInput,formatCurrency,formatPercentageDisplay} from '../src/businessRules';
test('entrada y presentación no redondean ni pierden centavos por multiplicación binaria',()=>{
 assert.equal(parseCurrencyInput('123,459').value,123.45);
 assert.equal(parsePercentageInput('1,239').ratio,0.0123);
 assert.equal(formatPercentageDisplay(0.29),'29.00%');
 assert.equal(formatPercentageDisplay(0.01239),'1.23%');
 assert.equal(formatCurrency(123.459),'$123.45');
});
