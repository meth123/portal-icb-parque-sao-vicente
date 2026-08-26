-- O envio Push filtra subscriptions pelo status ativo do perfil.
-- A chave secreta roda como service_role e permanece exclusivamente no servidor.
grant select on table public.profiles to service_role;
