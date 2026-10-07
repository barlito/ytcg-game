import { createContext, useContext } from 'react';
import type { DraggedCard } from '../../dnd.ts';

// The card being dragged, null otherwise: drop zones highlight from it.
export const DragContext = createContext<DraggedCard | null>(null);

export function useDragged(): DraggedCard | null {
  return useContext(DragContext);
}
