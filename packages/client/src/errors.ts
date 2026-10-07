import type { IllegalActionCode } from '@ytcg-game/engine';

// Engine refusals carry an English developer message: players read these instead.
const ACTION_ERRORS: Record<IllegalActionCode | 'notStarted' | 'gameOver' | 'roomFull' | 'alreadySeated', string> = {
  gameOver: 'La partie est terminée.',
  unknownPlayer: 'Joueur inconnu.',
  playerReady: 'Tu as déjà fini ton tour.',
  cardNotInHand: "Cette carte n'est pas dans ta main.",
  cardNotPending: "Cette carte n'a pas été posée ce tour-ci.",
  notEnoughEnergy: "Pas assez d'énergie.",
  unknownLocation: 'Lieu inconnu.',
  locationFull: 'Ce lieu est plein (4 cartes maximum).',
  mulliganUnavailable: 'La main ne se repioche qu’une fois, au tout début du tour 1.',
  notStarted: "La partie n'a pas commencé.",
  roomFull: 'Cette partie a déjà deux joueurs.',
  alreadySeated: 'Tu es déjà dans cette partie.',
};

export function actionErrorText(code: string, fallback: string): string {
  return code in ACTION_ERRORS ? ACTION_ERRORS[code as keyof typeof ACTION_ERRORS] : fallback;
}
