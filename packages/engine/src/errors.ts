export type IllegalActionCode =
  | 'gameOver'
  | 'unknownPlayer'
  | 'playerReady'
  | 'cardNotInHand'
  | 'cardNotPending'
  | 'notEnoughEnergy'
  | 'unknownLocation'
  | 'locationFull'
  | 'locationClosed'
  | 'mulliganUnavailable';

export class IllegalActionError extends Error {
  readonly code: IllegalActionCode;

  constructor(code: IllegalActionCode, message: string) {
    super(message);
    this.name = 'IllegalActionError';
    this.code = code;
  }
}

export class CatalogError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid game data:\n- ${issues.join('\n- ')}`);
    this.name = 'CatalogError';
    this.issues = issues;
  }
}

export class GameSetupError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid game setup:\n- ${issues.join('\n- ')}`);
    this.name = 'GameSetupError';
    this.issues = issues;
  }
}
