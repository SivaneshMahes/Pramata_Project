import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { wishlistService } from '@/services/wishlist.service';

const IDS_KEY = ['wishlist', 'ids'] as const;

/** Saved vehicle ids for the signed-in customer (one small request for every card). */
export function useWishlistIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: IDS_KEY,
    queryFn: async () => new Set((await wishlistService.ids()).vehicleIds),
    enabled: user?.role === 'CUSTOMER',
    staleTime: 60_000,
  });
}

export function useWishlist(page: number) {
  return useQuery({
    queryKey: ['wishlist', 'list', page],
    queryFn: () => wishlistService.list(page),
    placeholderData: keepPreviousData,
  });
}

/** Optimistic toggle: the heart fills on press, and rolls back if the request fails. */
export function useToggleWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, save }: { vehicleId: string; save: boolean }) =>
      save ? wishlistService.add(vehicleId) : wishlistService.remove(vehicleId),
    onMutate: async ({ vehicleId, save }) => {
      await queryClient.cancelQueries({ queryKey: IDS_KEY });
      const previous = queryClient.getQueryData<Set<string>>(IDS_KEY);
      const next = new Set(previous);
      if (save) next.add(vehicleId);
      else next.delete(vehicleId);
      queryClient.setQueryData(IDS_KEY, next);
      return { previous };
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(IDS_KEY, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });
}
