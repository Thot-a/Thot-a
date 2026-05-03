//+------------------------------------------------------------------+
//|                                     XAUUSD_LiquiditySweep.mq5   |
//|                    Gold Scalper — Liquidity Sweep Strategy       |
//|                    M5 Timeframe | ATR SL | Candle Trailing       |
//+------------------------------------------------------------------+
#property copyright "Liquidity Sweep EA"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>

//--- Input Parameters
input group    "=== Risk Settings ==="
input double   RiskPercent     = 1.0;    // Risk % per trade
input double   DailyDDLimit    = 3.0;    // Daily drawdown limit %

input group    "=== Indicator Settings ==="
input int      EMAPeriod       = 200;    // EMA period
input int      LookbackPeriod  = 5;      // Bars for High/Low sweep detection

input group    "=== Trade Settings ==="
input int      MaxSpread       = 35;     // Max allowed spread (points)
input double   ATRMultiplier   = 1.5;    // ATR multiplier for Stop Loss
input double   RRRatio         = 1.5;    // Risk:Reward ratio for Take Profit
input int      BEOffset        = 10;     // Breakeven offset above entry (points)
input int      MagicNumber     = 202401; // Unique EA identifier

//--- Global Variables
CTrade   trade;
int      emaHandle;
int      atrHandle;
double   startDayEquity;
datetime lastDayTime;
datetime lastBarTime;

//+------------------------------------------------------------------+
//| Expert initialization                                             |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(20);
   // ORDER_FILLING_RETURN is required by most ECN/STP brokers for XAUUSD
   trade.SetTypeFilling(ORDER_FILLING_RETURN);

   emaHandle = iMA(_Symbol, PERIOD_M5, EMAPeriod, 0, MODE_EMA, PRICE_CLOSE);
   atrHandle = iATR(_Symbol, PERIOD_M5, 14);

   if(emaHandle == INVALID_HANDLE || atrHandle == INVALID_HANDLE)
   {
      Print("ERROR [OnInit]: Failed to create indicator handles.");
      return INIT_FAILED;
   }

   startDayEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   lastDayTime    = TimeCurrent();
   lastBarTime = 0;

   Print("EA Initialized | Symbol: ", _Symbol,
         " | Magic: ", MagicNumber,
         " | Risk: ", RiskPercent, "%");
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization                                           |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   IndicatorRelease(emaHandle);
   IndicatorRelease(atrHandle);
   Print("EA Deinitialized | Reason code: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   // Always update daily session tracker
   UpdateDailyEquity();

   // Always manage any open trade (breakeven + trailing) every tick
   ManageOpenTrade();

   // Check daily drawdown — halt new entries if breached
   if(!CheckDailyDrawdown())
      return;

   // Only evaluate new entries on new bar close (M5)
   datetime currentBarTime = iTime(_Symbol, PERIOD_M5, 0);
   if(currentBarTime == lastBarTime)
      return;
   lastBarTime = currentBarTime;

   // Skip if a position is already open for this EA
   if(HasOpenPosition())
      return;

   // --- Spread filter ---
   long spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spread > MaxSpread)
   {
      Print("SKIP [Spread]: ", spread, " > ", MaxSpread, " points.");
      return;
   }

   // --- Fetch indicator buffers (bar 1 = last closed bar) ---
   double emaVal[], atrVal[];
   ArraySetAsSeries(emaVal, true);
   ArraySetAsSeries(atrVal, true);

   if(CopyBuffer(emaHandle, 0, 0, 3, emaVal) < 3)
   { Print("ERROR [EMA]: Buffer copy failed."); return; }
   if(CopyBuffer(atrHandle, 0, 0, 3, atrVal) < 3)
   { Print("ERROR [ATR]: Buffer copy failed."); return; }

   double ema   = emaVal[1]; // EMA value at last closed bar
   double atr   = atrVal[1]; // ATR value at last closed bar

   double close1 = iClose(_Symbol, PERIOD_M5, 1);
   double high1  = iHigh (_Symbol, PERIOD_M5, 1);
   double low1   = iLow  (_Symbol, PERIOD_M5, 1);

   // --- Lookback range: bars 2 .. (LookbackPeriod+1) ---
   // These are the N bars BEFORE the signal candle (bar 1)
   double lowestLow   = GetLowestLow  (2, LookbackPeriod);
   double highestHigh = GetHighestHigh(2, LookbackPeriod);

   if(lowestLow == 0 || highestHigh == 0)
   { Print("ERROR: Could not compute lookback High/Low."); return; }

   double slDistance = atr * ATRMultiplier;
   double tpDistance = slDistance * RRRatio;
   double lots       = CalculateLotSize(slDistance);

   if(lots <= 0)
   { Print("ERROR: Invalid lot size. SL distance: ", slDistance); return; }

   // ================================================================
   // BUY SETUP — Liquidity Sweep Below (Bullish)
   // Condition: close > EMA(200)  AND  low swept below lowestLow
   //            AND  candle closed back above lowestLow
   // ================================================================
   if(close1 > ema)
   {
      if(low1 < lowestLow && close1 > lowestLow)
      {
         double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double sl  = NormalizeDouble(ask - slDistance, _Digits);
         double tp  = NormalizeDouble(ask + tpDistance, _Digits);

         if(trade.Buy(lots, _Symbol, ask, sl, tp, "LiqSweep BUY"))
            Print("BUY OPENED | Entry: ", ask,
                  " | SL: ", sl, " | TP: ", tp,
                  " | Lots: ", lots,
                  " | ATR: ", atr);
         else
            Print("ERROR [BUY]: Code ", trade.ResultRetcode(),
                  " — ", trade.ResultRetcodeDescription());
      }
   }

   // ================================================================
   // SELL SETUP — Liquidity Sweep Above (Bearish)
   // Condition: close < EMA(200)  AND  high swept above highestHigh
   //            AND  candle closed back below highestHigh
   // ================================================================
   if(close1 < ema)
   {
      if(high1 > highestHigh && close1 < highestHigh)
      {
         double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double sl  = NormalizeDouble(bid + slDistance, _Digits);
         double tp  = NormalizeDouble(bid - tpDistance, _Digits);

         if(trade.Sell(lots, _Symbol, bid, sl, tp, "LiqSweep SELL"))
            Print("SELL OPENED | Entry: ", bid,
                  " | SL: ", sl, " | TP: ", tp,
                  " | Lots: ", lots,
                  " | ATR: ", atr);
         else
            Print("ERROR [SELL]: Code ", trade.ResultRetcode(),
                  " — ", trade.ResultRetcodeDescription());
      }
   }
}

//+------------------------------------------------------------------+
//| Manage open trade: Breakeven + Candle Trailing Stop              |
//+------------------------------------------------------------------+
void ManageOpenTrade()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket))              continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)     continue;

      double entryPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentSL  = PositionGetDouble(POSITION_SL);
      double currentTP  = PositionGetDouble(POSITION_TP);
      ENUM_POSITION_TYPE posType =
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);

      // Back-calculate SL distance from stored TP
      double slDistance = MathAbs(currentTP - entryPrice) / RRRatio;
      double point      = _Point;

      // ----------------------------------------------------------
      // BUY trade management
      // ----------------------------------------------------------
      if(posType == POSITION_TYPE_BUY)
      {
         double currentBid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double beLevel    = entryPrice + slDistance;          // 1:1 RR price
         double beSL       = NormalizeDouble(entryPrice + BEOffset * point, _Digits);

         // Step 1: Move SL to breakeven once 1:1 is reached
         if(currentBid >= beLevel && currentSL < beSL)
         {
            if(trade.PositionModify(ticket, beSL, currentTP))
               Print("BUY BE SET | Ticket: ", ticket,
                     " | New SL: ", beSL);
            else
               Print("ERROR [BUY BE]: Code ", trade.ResultRetcode(),
                     " — ", trade.ResultRetcodeDescription());
            return; // avoid modifying twice in same tick
         }

         // Step 2: Candle trail — after BE is active
         if(currentSL >= beSL - point)
         {
            double trailSL = NormalizeDouble(
               MathMin(iLow(_Symbol, PERIOD_M5, 1),
                       iLow(_Symbol, PERIOD_M5, 2)), _Digits);

            // Only tighten, never widen; must stay below current price
            if(trailSL > currentSL && trailSL < currentBid)
            {
               if(trade.PositionModify(ticket, trailSL, currentTP))
                  Print("BUY TRAIL | Ticket: ", ticket,
                        " | New SL: ", trailSL);
               else
                  Print("ERROR [BUY TRAIL]: Code ", trade.ResultRetcode(),
                        " — ", trade.ResultRetcodeDescription());
            }
         }
      }

      // ----------------------------------------------------------
      // SELL trade management
      // ----------------------------------------------------------
      else if(posType == POSITION_TYPE_SELL)
      {
         double currentAsk = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double beLevel    = entryPrice - slDistance;          // 1:1 RR price
         double beSL       = NormalizeDouble(entryPrice - BEOffset * point, _Digits);

         // Step 1: Move SL to breakeven once 1:1 is reached
         if(currentAsk <= beLevel && currentSL > beSL)
         {
            if(trade.PositionModify(ticket, beSL, currentTP))
               Print("SELL BE SET | Ticket: ", ticket,
                     " | New SL: ", beSL);
            else
               Print("ERROR [SELL BE]: Code ", trade.ResultRetcode(),
                     " — ", trade.ResultRetcodeDescription());
            return;
         }

         // Step 2: Candle trail — after BE is active
         if(currentSL <= beSL + point)
         {
            double trailSL = NormalizeDouble(
               MathMax(iHigh(_Symbol, PERIOD_M5, 1),
                       iHigh(_Symbol, PERIOD_M5, 2)), _Digits);

            // Only tighten, never widen; must stay above current price
            if(trailSL < currentSL && trailSL > currentAsk)
            {
               if(trade.PositionModify(ticket, trailSL, currentTP))
                  Print("SELL TRAIL | Ticket: ", ticket,
                        " | New SL: ", trailSL);
               else
                  Print("ERROR [SELL TRAIL]: Code ", trade.ResultRetcode(),
                        " — ", trade.ResultRetcodeDescription());
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Returns true if this EA already has an open position             |
//+------------------------------------------------------------------+
bool HasOpenPosition()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) == MagicNumber &&
         PositionGetString(POSITION_SYMBOL) == _Symbol)
         return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Reset start-of-day equity on each new calendar day               |
//+------------------------------------------------------------------+
void UpdateDailyEquity()
{
   MqlDateTime now, last;
   TimeToStruct(TimeCurrent(), now);
   TimeToStruct(lastDayTime,   last);

   if(now.day != last.day || now.mon != last.mon || now.year != last.year)
   {
      startDayEquity = AccountInfoDouble(ACCOUNT_EQUITY);
      lastDayTime    = TimeCurrent();
      Print("NEW DAY | Start equity reset to: ", startDayEquity);
   }
}

//+------------------------------------------------------------------+
//| Returns false and logs if daily drawdown limit is exceeded        |
//+------------------------------------------------------------------+
bool CheckDailyDrawdown()
{
   double equity   = AccountInfoDouble(ACCOUNT_EQUITY);
   double ddPct    = (startDayEquity - equity) / startDayEquity * 100.0;

   if(ddPct >= DailyDDLimit)
   {
      Print("DAILY DD LIMIT HIT | Drawdown: ", DoubleToString(ddPct, 2),
            "% >= ", DailyDDLimit, "%. No new trades today.");
      return false;
   }
   return true;
}

//+------------------------------------------------------------------+
//| Dynamic lot size from RiskPercent + ATR-based SL distance        |
//+------------------------------------------------------------------+
double CalculateLotSize(double slDistance)
{
   if(slDistance <= 0) return 0;

   double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmt   = balance * RiskPercent / 100.0;
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);

   if(tickSize <= 0 || tickValue <= 0) return 0;

   // Monetary value of slDistance per 1 lot
   double slValue = (slDistance / tickSize) * tickValue;
   double lots    = riskAmt / slValue;

   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double step    = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   lots = MathFloor(lots / step) * step;
   lots = MathMax(minLot, MathMin(maxLot, lots));

   return NormalizeDouble(lots, 2);
}

//+------------------------------------------------------------------+
//| Lowest Low across bars [startBar .. startBar+count-1]            |
//+------------------------------------------------------------------+
double GetLowestLow(int startBar, int count)
{
   double lowest = DBL_MAX;
   for(int i = startBar; i < startBar + count; i++)
   {
      double low = iLow(_Symbol, PERIOD_M5, i);
      if(low < lowest) lowest = low;
   }
   return (lowest == DBL_MAX) ? 0 : lowest;
}

//+------------------------------------------------------------------+
//| Highest High across bars [startBar .. startBar+count-1]          |
//+------------------------------------------------------------------+
double GetHighestHigh(int startBar, int count)
{
   double highest = -DBL_MAX;
   for(int i = startBar; i < startBar + count; i++)
   {
      double high = iHigh(_Symbol, PERIOD_M5, i);
      if(high > highest) highest = high;
   }
   return (highest == -DBL_MAX) ? 0 : highest;
}
//+------------------------------------------------------------------+
