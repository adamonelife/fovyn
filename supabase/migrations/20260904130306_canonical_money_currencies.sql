create table public.currency_catalog (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  name text not null,
  symbol text not null
);

insert into public.currency_catalog(code,name,symbol) values
('AED','United Arab Emirates Dirham','د.إ'),('ARS','Argentine Peso','$'),('AUD','Australian Dollar','A$'),('BDT','Bangladeshi Taka','৳'),('BGN','Bulgarian Lev','лв'),('BHD','Bahraini Dinar','د.ب'),('BRL','Brazilian Real','R$'),('CAD','Canadian Dollar','CA$'),('CHF','Swiss Franc','CHF'),('CLP','Chilean Peso','CLP$'),('CNY','Chinese Yuan','CN¥'),('COP','Colombian Peso','COL$'),('CZK','Czech Koruna','Kč'),('DKK','Danish Krone','kr'),('DZD','Algerian Dinar','دج'),('EGP','Egyptian Pound','E£'),('EUR','Euro','€'),('GBP','British Pound Sterling','£'),('GHS','Ghanaian Cedi','GH₵'),('HKD','Hong Kong Dollar','HK$'),('HUF','Hungarian Forint','Ft'),('IDR','Indonesian Rupiah','Rp'),('ILS','Israeli New Shekel','₪'),('INR','Indian Rupee','₹'),('ISK','Icelandic Króna','kr'),('JPY','Japanese Yen','¥'),('KES','Kenyan Shilling','KSh'),('KRW','South Korean Won','₩'),('KWD','Kuwaiti Dinar','د.ك'),('MAD','Moroccan Dirham','د.م.'),('MXN','Mexican Peso','MX$'),('MYR','Malaysian Ringgit','RM'),('NGN','Nigerian Naira','₦'),('NOK','Norwegian Krone','kr'),('NZD','New Zealand Dollar','NZ$'),('OMR','Omani Rial','ر.ع.'),('PEN','Peruvian Sol','S/'),('PHP','Philippine Peso','₱'),('PKR','Pakistani Rupee','₨'),('PLN','Polish Zloty','zł'),('QAR','Qatari Riyal','ر.ق'),('RON','Romanian Leu','lei'),('SAR','Saudi Riyal','ر.س'),('SEK','Swedish Krona','kr'),('SGD','Singapore Dollar','S$'),('THB','Thai Baht','฿'),('TRY','Turkish Lira','₺'),('TWD','New Taiwan Dollar','NT$'),('UGX','Ugandan Shilling','USh'),('USD','United States Dollar','$'),('VND','Vietnamese Dong','₫'),('XAF','Central African CFA Franc','FCFA'),('XOF','West African CFA Franc','CFA'),('ZAR','South African Rand','R');

alter table public.currency_catalog enable row level security;
create policy currency_catalog_read on public.currency_catalog for select to authenticated using (true);
grant select on public.currency_catalog to authenticated;
revoke all on public.currency_catalog from anon;

alter table public.money_accounts add constraint money_accounts_currency_catalog_fk foreign key(currency) references public.currency_catalog(code);
alter table public.money_transactions add constraint money_transactions_currency_catalog_fk foreign key(currency) references public.currency_catalog(code);
alter table public.money_transactions add constraint money_transactions_destination_currency_catalog_fk foreign key(destination_currency) references public.currency_catalog(code);
alter table public.money_recurring_items add constraint money_recurring_currency_catalog_fk foreign key(currency) references public.currency_catalog(code);
alter table public.money_fx_rates add constraint money_fx_base_currency_catalog_fk foreign key(base_currency) references public.currency_catalog(code);
alter table public.money_fx_rates add constraint money_fx_quote_currency_catalog_fk foreign key(quote_currency) references public.currency_catalog(code);
alter table public.profiles add constraint profiles_default_currency_catalog_fk foreign key(default_currency) references public.currency_catalog(code);

comment on table public.currency_catalog is 'Canonical currencies supported by Fovyn Money; codes are ISO 4217 where applicable.';
