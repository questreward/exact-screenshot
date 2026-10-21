import { MutationCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Server state is the only truth: after any successful action every visible
 * figure is re-read from the server, in this tab and in other open tabs.
 * Pages are also re-read when the tab regains focus or the network returns.
 */
export const getRouter = () => {
  const channel = typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel("civitas-sync") : null;
  const queryClient: QueryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: true, refetchOnReconnect: true }, mutations: { retry: false } },
    mutationCache: new MutationCache({
      onSettled: () => {
        void queryClient.invalidateQueries({ refetchType: "active" });
        channel?.postMessage("changed");
      },
    }),
  });
  if (channel) channel.onmessage = () => void queryClient.invalidateQueries({ refetchType: "active" });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
