import type { AnyAlgo } from '../types';
import { ARRAY_ALGOS } from './arrays';
import { DP_ALGOS } from './dp';
import { GRAPH_ALGOS } from './graphs';
import { MISC_ALGOS } from './misc';
import { TREE_ALGOS } from './trees';
import { binarySearch } from './binarySearch';
import { bubbleSort } from './bubbleSort';
import { insertionSort } from './insertionSort';
import { linearSearch } from './linearSearch';
import { mergeSort } from './mergeSort';
import { quickSort } from './quickSort';
import { selectionSort } from './selectionSort';

export const ALGOS: AnyAlgo[] = [
  bubbleSort, selectionSort, insertionSort, mergeSort, quickSort, linearSearch, binarySearch,
  ...ARRAY_ALGOS, ...TREE_ALGOS, ...GRAPH_ALGOS, ...DP_ALGOS, ...MISC_ALGOS,
];

export const getAlgo = (id: string) => ALGOS.find((a) => a.id === id);
