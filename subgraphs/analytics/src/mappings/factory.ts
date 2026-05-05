/* eslint-disable prefer-const */
import { Address, BigInt } from '@graphprotocol/graph-ts'

import { CustomPool, Pool as PoolEvent } from '../types/Factory/Factory'
import { Pool, Token } from '../types/schema'
import { Pool as PoolTemplate } from '../types/templates'
import { Pool as PoolContract } from '../types/templates/Pool/Pool'
import { ZERO_ADDRESS, ZERO_BI } from '../utils/constants'
import { fetchTokenDecimals, fetchTokenName, fetchTokenSymbol } from '../utils/token'

export function handlePoolCreated(event: PoolEvent): void {
  createPool(
    event.params.pool.toHexString(),
    event.params.token0.toHexString(),
    event.params.token1.toHexString(),
    ZERO_ADDRESS,
    event.block.number,
  )
}

export function handleCustomPoolCreated(event: CustomPool): void {
  createPool(
    event.params.pool.toHexString(),
    event.params.token0.toHexString(),
    event.params.token1.toHexString(),
    event.params.deployer.toHexString(),
    event.block.number,
  )
}

function createPool(poolAddress: string, token0Address: string, token1Address: string, deployer: string, blockNumber: BigInt): void {
  let poolContractAddress = Address.fromString(poolAddress)
  let poolContract = PoolContract.bind(poolContractAddress)
  let feeResult = poolContract.try_fee()
  let globalStateResult = poolContract.try_globalState()
  let pluginResult = poolContract.try_plugin()
  let tickSpacingResult = poolContract.try_tickSpacing()

  let token0 = Token.load(token0Address)
  let token1 = Token.load(token1Address)

  if (token0 === null) {
    token0 = new Token(token0Address)
    token0.symbol = fetchTokenSymbol(Address.fromString(token0Address))
    token0.name = fetchTokenName(Address.fromString(token0Address))
    token0.decimals = fetchTokenDecimals(Address.fromString(token0Address))
  }

  if (token1 === null) {
    token1 = new Token(token1Address)
    token1.symbol = fetchTokenSymbol(Address.fromString(token1Address))
    token1.name = fetchTokenName(Address.fromString(token1Address))
    token1.decimals = fetchTokenDecimals(Address.fromString(token1Address))
  }

  let pool = new Pool(poolAddress)
  pool.token0 = token0.id
  pool.token1 = token1.id
  pool.deployer = Address.fromString(deployer)
  pool.plugin = pluginResult.reverted ? Address.fromString(ZERO_ADDRESS) : pluginResult.value
  pool.pluginConfig = globalStateResult.reverted ? 0 : globalStateResult.value.getPluginConfig()
  pool.createdAtBlockNumber = blockNumber
  pool.fee = feeResult.reverted ? ZERO_BI : BigInt.fromI32(feeResult.value as i32)
  pool.communityFee = globalStateResult.reverted ? ZERO_BI : BigInt.fromI32(globalStateResult.value.getCommunityFee())
  pool.tickSpacing = tickSpacingResult.reverted ? ZERO_BI : BigInt.fromI32(tickSpacingResult.value as i32)

  pool.save()
  PoolTemplate.create(poolContractAddress)
  token0.save()
  token1.save()
}
