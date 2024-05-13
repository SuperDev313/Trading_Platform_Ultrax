import React, { useEffect, useMemo, useState } from "react";
import NoLiquidityErrorModal from "./NoLiquidityErrorModal";

export default function SwapBox(props) {
  return (
    <div className="Exchange-swap-box">
      <NoLiquidityErrorModal
        chainId={chainId}
        fromToken={fromToken}
        toToken={toToken}
        shortCollateralToken={shortCollateralToken}
        isLong={isLong}
        isShort={isShort}
        modalError={modalError}
        setModalError={setModalError}
      />
    </div>
  );
}
