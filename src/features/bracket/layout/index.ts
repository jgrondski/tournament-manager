export * from './types';
export * from './singleElimLayout';
export * from './doubleElimLayout';
export * from './hybridLayout';

import { BracketStructure } from '../types';
import { LayoutConfig, BracketViewMode, BracketLayoutMetadata } from './types';
import { calculateTraditionalSingleElimLayout, calculateSplitBracketLayout } from './singleElimLayout';
import { calculateDoubleEliminationBracketLayout } from './doubleElimLayout';

/**
 * Main Layout Calculator supporting standard, fit, and split bilateral modes.
 * Dynamically routes to Traditional Single Elim, Double Elim, or Accelerated Hybrid layout engines.
 */
export function calculateBracketLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>,
  viewMode: BracketViewMode = 'standard'
): BracketLayoutMetadata {
  if (bracket.eliminationType === 'DOUBLE') {
    return calculateDoubleEliminationBracketLayout(bracket, customConfig, viewMode);
  }

  if (viewMode === 'split') {
    return calculateSplitBracketLayout(bracket, customConfig);
  }

  return calculateTraditionalSingleElimLayout(bracket, customConfig, viewMode);
}