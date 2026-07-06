/**
 * IronLock.xyz — Refund Pool Calculations
 *
 * Shared refund pool logic used across the explore page, token page,
 * and dashboard. Single source of truth for milestone percentages.
 */

const MILESTONE_BPS = [3300n, 3300n, 3400n]; // 33%, 33%, 34%

/** Total BPS released given the number of milestones completed (0-3). */
export function getRefundPoolReleasedBps(milestoneReleased: number): bigint {
  let bps = 0n;
  for (let i = 0; i < milestoneReleased && i < MILESTONE_BPS.length; i++) {
    bps += MILESTONE_BPS[i];
  }
  return bps;
}

/** Remaining refundable pool in wei. */
export function getRefundPool(
  totalRaised: bigint,
  milestoneReleased: number
): bigint {
  const releasedBps = getRefundPoolReleasedBps(milestoneReleased);
  const released = (totalRaised * releasedBps) / 10000n;
  return totalRaised - released;
}
