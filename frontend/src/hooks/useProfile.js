import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services';

export const PROFILE_QUERY_KEY = ['user', 'profile'];

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const { data } = await userService.getProfile();
      return data.data.user;
    },
    retry: false,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => userService.updateProfile(payload).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

export function useUpdatePasswordMutation() {
  return useMutation({
    mutationFn: (payload) => userService.updatePassword(payload).then((res) => res.data),
  });
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return userService.uploadAvatar(formData).then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
