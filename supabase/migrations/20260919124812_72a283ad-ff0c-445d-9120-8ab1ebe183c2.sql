ALTER FUNCTION public.current_balance(UUID) SECURITY INVOKER;
ALTER FUNCTION public.check_withdrawal_balance() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.check_withdrawal_balance() FROM PUBLIC, anon, authenticated;