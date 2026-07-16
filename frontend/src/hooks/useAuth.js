import { useMutation } from '@tanstack/react-query';
import { authService } from '../services';
import { setAccessToken, clearAccessToken } from '../lib/token';

export function useLoginMutation() {
  return useMutation({
    mutationFn: (credentials) => authService.login(credentials).then((res) => res.data),
    onSuccess: (data) => {
      setAccessToken(data.data.accessToken);
    },
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (payload) => authService.register(payload).then((res) => res.data),
    onSuccess: (data) => {
      setAccessToken(data.data.accessToken);
    },
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: () => authService.logout().then((res) => res.data),
    onSettled: () => {
      clearAccessToken();
    },
  });
}
