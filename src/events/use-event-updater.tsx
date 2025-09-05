import { useEffect, useReducer } from "react";
import { EventMap, eventUpdater } from "./event-updater";

export function useEventUpdater<E extends keyof EventMap>(...eventNames: E[]) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    eventNames.forEach((event: E) => eventUpdater.on(event, forceUpdate));

    return () => {
      eventNames.forEach((event) => eventUpdater.off(event, forceUpdate));
    };
  }, [...eventNames]);
}
