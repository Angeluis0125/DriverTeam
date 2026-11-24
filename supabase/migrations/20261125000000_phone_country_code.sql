-- Teléfonos guardados sin lada (10 dígitos) en cuentas en pesos mexicanos → anteponer 52,
-- para que WhatsApp los reconozca. Se omiten clientes que ya existan con la lada (unique driver_id+phone).
update public.customers c
set phone = '52' || c.phone
from public.drivers d
where d.id = c.driver_id
  and d.currency = 'MXN'
  and c.phone ~ '^[0-9]{10}$'
  and not exists (
    select 1 from public.customers x where x.driver_id = c.driver_id and x.phone = '52' || c.phone
  );

update public.drivers
set phone = '52' || regexp_replace(phone, '\D', '', 'g')
where currency = 'MXN'
  and regexp_replace(coalesce(phone, ''), '\D', '', 'g') ~ '^[0-9]{10}$';
