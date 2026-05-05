/* eslint-disable prefer-const */
import { BigInt } from '@graphprotocol/graph-ts'

import {
  CommunityFee,
  Fee as ChangeFee,
  PluginConfig,
  Plugin as PluginEvent,
  TickSpacing,
} from '../types/templates/Pool/Pool'
import { Pool } from '../types/schema'

export function handleSetCommunityFee(event: CommunityFee): void {
  let pool = Pool.load(event.address.toHexString())
  if (pool) {
    pool.communityFee = BigInt.fromI32(event.params.communityFeeNew)
    pool.save()
  }
}

export function handleSetTickSpacing(event: TickSpacing): void {
  let pool = Pool.load(event.address.toHexString())
  if (pool) {
    pool.tickSpacing = BigInt.fromI32(event.params.newTickSpacing as i32)
    pool.save()
  }
}

export function handleChangeFee(event: ChangeFee): void {
  let pool = Pool.load(event.address.toHexString())
  if (pool) {
    pool.fee = BigInt.fromI32(event.params.fee as i32)
    pool.save()
  }
}

export function handlePlugin(event: PluginEvent): void {
  let pool = Pool.load(event.address.toHexString())
  if (pool) {
    pool.plugin = event.params.newPluginAddress
    pool.save()
  }
}

export function handlePluginConfig(event: PluginConfig): void {
  let pool = Pool.load(event.address.toHexString())
  if (pool) {
    pool.pluginConfig = event.params.newPluginConfig
    pool.save()
  }
}
