//+------------------------------------------------------------------+
//|                         XAUUSD_MeanRevSniper_M1.mq5              |
//|           M1 Mean Reversion Sniper — Gold Scalper                 |
//|   BB Squeeze + Liquidity Sweep + Mean Reversion to Middle Band    |
//|   Designed for: RoboForex, XAUUSD, $200 account                  |
//+------------------------------------------------------------------+
#property copyright "Mean Reversion Sniper EA"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>

//===================================================================
// INPUT PARAMETERS
//===================================================================

input group "=== Trade Settings ==="
input double  FixedLots      = 0.01;  // Fixed lot size (strict for $200)
input int     SLBuffer       = 50;    // Points beyond signal candle wick
input int     MinSLPoints    = 150;   // Minimum SL distance (points)
input int     MaxSLPoints    = 300;   // Maximum SL — void trade if exceeded
input int     BEOffset       = 10;    // Breakeven offset beyond entry (points)

input group "=== Daily Limits ==="
input double  DailyProfitTarget = 10.0; // Stop trading at +$10 profit
input double  DailyLossLimit    =  6.0; // Stop trading at -$6 loss

input group "=== Safety Filters ==="
input int     MaxSpread      = 25;    // Max spread in points

input group "=== Indicator Settings ==="
input int     EMAPeriod      = 200;   // EMA trend filter period
input int     BBPeriod       = 20;    // Bollinger Bands period
input double  BBDeviation    = 2.5;   // Bollinger Bands deviation
input int     LookbackPeriod = 5;     // Bars for liquidity sweep detection

input group "=== EA Identity ==="
input int     MagicNumber    = 202403;

//===================================================================
// GLOBAL STATE
//===================================================================
CTrade   trade;
int      emaHandle;
int      bbHandle;
double   startDayEquity;
datetime lastDayTime;
datetime lastBarTime;

//===================================================================
// INITIALIZATION
//===================================================================
int OnInit()
{
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(30);
   trade.SetTypeFilling(ORDER_FILLING_RETURN);

   emaHandle = iMA   (_Symbol, PERIOD_M1, EMAPeriod, 0, MODE_EMA, PRICE_CLOSE);
   bbHandle  = iBands(_Symbol, PERIOD_M1, BBPeriod,  0, BBDeviation, PRICE_CLOSE);

   if(emaHandle == INVALID_HANDLE || bbHandle == INVALID_HANDLE)
   {
      Print("ERROR [OnInit]: Indicator handle creation failed.");
      return INIT_FAILED;
   }

   startDayEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   lastDayTime    = TimeCurrent();
   lastBarTime    = 0;

   Print("=== Mean Reversion Sniper M1 Initialized ===");
   Print("Symbol:", _Symbol, " | Magic:", MagicNumber);
   Print("Daily Target: +$", DailyProfitTarget,
         " | Daily Limit: -$", DailyLossLimit);
   Print("SL Range:", MinSLPoints, "-", MaxSLPoints, " pts | MaxSpread:", MaxSpread);

   return INIT_SUCCEEDED;
}

//===================================================================
// DEINITIALIZATION
//===================================================================
void OnDeinit(const int reason)
{
   IndicatorRelease(emaHandle);
   IndicatorRelease(bbHandle);
   Print("EA Deinitialized | Reason:", reason);
}

//===================================================================
// MAIN TICK
//===================================================================
void OnTick()
{
   UpdateDailyTracking();

   // Breakeven runs every tick — fast response
   ManageBreakeven();

   // New M1 bar gate
   datetime currentBarTime = iTime(_Symbol, PERIOD_M1, 0);
   if(currentBarTime == lastBarTime) return;
   lastBarTime = currentBarTime;

   // Daily P&L gates
   if(!CheckDailyLimits()) return;

   // One trade at a time
   if(HasOpenPosition()) return;

   // Spread check
   long spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spread > MaxSpread)
   {
      Print("SKIP [Spread]:", spread, " pts (max:", MaxSpread, ")");
      return;
   }

   // -------------------------------------------------------
   // Fetch indicator buffers — bar 1 = last confirmed close
   // BB buffer indices: 0=Middle, 1=Upper, 2=Lower
   // -------------------------------------------------------
   double emaVal[], bbMid[], bbUpper[], bbLower[];
   ArraySetAsSeries(emaVal,  true);
   ArraySetAsSeries(bbMid,   true);
   ArraySetAsSeries(bbUpper, true);
   ArraySetAsSeries(bbLower, true);

   if(CopyBuffer(emaHandle, 0, 0, 3, emaVal)  < 3) { Print("ERROR: EMA buffer.");      return; }
   if(CopyBuffer(bbHandle,  0, 0, 3, bbMid)   < 3) { Print("ERROR: BB Mid buffer.");   return; }
   if(CopyBuffer(bbHandle,  1, 0, 3, bbUpper) < 3) { Print("ERROR: BB Upper buffer."); return; }
   if(CopyBuffer(bbHandle,  2, 0, 3, bbLower) < 3) { Print("ERROR: BB Lower buffer."); return; }

   double ema       = emaVal[1];
   double midBand   = bbMid[1];
   double upperBand = bbUpper[1];
   double lowerBand = bbLower[1];

   double close1 = iClose(_Symbol, PERIOD_M1, 1);
   double high1  = iHigh (_Symbol, PERIOD_M1, 1);
   double low1   = iLow  (_Symbol, PERIOD_M1, 1);

   // Lookback range: bars 2 to (LookbackPeriod+1), N bars before signal bar
   double lowestLow   = GetLowestLow  (2, LookbackPeriod);
   double highestHigh = GetHighestHigh(2, LookbackPeriod);
   if(lowestLow <= 0 || highestHigh <= 0) return;

   double minStop = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;

   // ================================================================
   // BUY SETUP — Mean Reversion from Lower Band
   // 1. close > EMA 200           → uptrend confirmed
   // 2. low < Lower BB            → price pierced the band
   // 3. low < LowestLow(5 bars)   → liquidity sweep triggered
   // 4. close > Lower BB          → rejection, candle closed back inside
   // ================================================================
   if(close1 > ema      &&
      low1   < lowerBand &&
      low1   < lowestLow &&
      close1 > lowerBand)
   {
      double ask    = SymbolInfoDouble(_Symbol, SYMBOL_ASK);

      // SL = signal candle low minus buffer
      double rawSL  = NormalizeDouble(low1 - SLBuffer * _Point, _Digits);
      double slDist = ask - rawSL;

      // Apply minimum SL floor
      if(slDist < MinSLPoints * _Point)
      {
         rawSL  = NormalizeDouble(ask - MinSLPoints * _Point, _Digits);
         slDist = ask - rawSL;
      }

      // Void trade if SL exceeds maximum — capital protection
      if(slDist > MaxSLPoints * _Point)
      {
         Print("VOID BUY: SL=", DoubleToString(slDist / _Point, 0),
               " pts exceeds max ", MaxSLPoints, " pts.");
         return;
      }

      // TP = Middle Bollinger Band (mean reversion magnet)
      double tp = NormalizeDouble(midBand, _Digits);

      // TP must be above entry
      if(tp <= ask)
      {
         Print("VOID BUY: TP(", tp, ") <= Entry(", ask, "). Mid band below price.");
         return;
      }

      // Broker minimum stop level validation
      if(ask - rawSL < minStop || tp - ask < minStop)
      {
         Print("VOID BUY: Violates broker min stop level (",
               DoubleToString(minStop / _Point, 0), " pts).");
         return;
      }

      if(trade.Buy(FixedLots, _Symbol, ask, rawSL, tp, "MRS BUY"))
         Print("BUY | Entry:", ask,
               " SL:", rawSL, "(", DoubleToString(slDist / _Point, 0), "pts)",
               " TP:", tp, "(MidBB) Spread:", spread);
      else
         Print("ERROR [BUY]:", trade.ResultRetcode(),
               " — ", trade.ResultRetcodeDescription());
   }

   // ================================================================
   // SELL SETUP — Mean Reversion from Upper Band
   // 1. close < EMA 200            → downtrend confirmed
   // 2. high > Upper BB            → price pierced the band
   // 3. high > HighestHigh(5 bars) → liquidity sweep triggered
   // 4. close < Upper BB           → rejection, candle closed back inside
   // ================================================================
   if(close1 < ema       &&
      high1  > upperBand &&
      high1  > highestHigh &&
      close1 < upperBand)
   {
      double bid    = SymbolInfoDouble(_Symbol, SYMBOL_BID);

      // SL = signal candle high plus buffer
      double rawSL  = NormalizeDouble(high1 + SLBuffer * _Point, _Digits);
      double slDist = rawSL - bid;

      // Apply minimum SL floor
      if(slDist < MinSLPoints * _Point)
      {
         rawSL  = NormalizeDouble(bid + MinSLPoints * _Point, _Digits);
         slDist = rawSL - bid;
      }

      // Void trade if SL exceeds maximum — capital protection
      if(slDist > MaxSLPoints * _Point)
      {
         Print("VOID SELL: SL=", DoubleToString(slDist / _Point, 0),
               " pts exceeds max ", MaxSLPoints, " pts.");
         return;
      }

      // TP = Middle Bollinger Band (mean reversion magnet)
      double tp = NormalizeDouble(midBand, _Digits);

      // TP must be below entry
      if(tp >= bid)
      {
         Print("VOID SELL: TP(", tp, ") >= Entry(", bid, "). Mid band above price.");
         return;
      }

      // Broker minimum stop level validation
      if(rawSL - bid < minStop || bid - tp < minStop)
      {
         Print("VOID SELL: Violates broker min stop level (",
               DoubleToString(minStop / _Point, 0), " pts).");
         return;
      }

      if(trade.Sell(FixedLots, _Symbol, bid, rawSL, tp, "MRS SELL"))
         Print("SELL | Entry:", bid,
               " SL:", rawSL, "(", DoubleToString(slDist / _Point, 0), "pts)",
               " TP:", tp, "(MidBB) Spread:", spread);
      else
         Print("ERROR [SELL]:", trade.ResultRetcode(),
               " — ", trade.ResultRetcodeDescription());
   }
}

//===================================================================
// BREAKEVEN — every tick
// Triggers when price covers 50% of the distance toward TP.
// Moves SL to entry + BEOffset points (risk-free zone).
//===================================================================
void ManageBreakeven()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket))               continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)     continue;

      double entry = PositionGetDouble(POSITION_PRICE_OPEN);
      double curSL = PositionGetDouble(POSITION_SL);
      double curTP = PositionGetDouble(POSITION_TP);
      ENUM_POSITION_TYPE type =
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double pt = _Point;

      if(type == POSITION_TYPE_BUY)
      {
         double halfWay = entry + (curTP - entry) * 0.5;
         double beSL    = NormalizeDouble(entry + BEOffset * pt, _Digits);
         double bid     = SymbolInfoDouble(_Symbol, SYMBOL_BID);

         if(bid >= halfWay && curSL < beSL - pt)
         {
            if(trade.PositionModify(ticket, beSL, curTP))
               Print("BE [BUY] Ticket:", ticket,
                     " Price:", bid, " HalfWay:", halfWay, " NewSL:", beSL);
            else
               Print("ERROR [BE BUY]:", trade.ResultRetcode(),
                     " — ", trade.ResultRetcodeDescription());
         }
      }
      else if(type == POSITION_TYPE_SELL)
      {
         double halfWay = entry - (entry - curTP) * 0.5;
         double beSL    = NormalizeDouble(entry - BEOffset * pt, _Digits);
         double ask     = SymbolInfoDouble(_Symbol, SYMBOL_ASK);

         if(ask <= halfWay && curSL > beSL + pt)
         {
            if(trade.PositionModify(ticket, beSL, curTP))
               Print("BE [SELL] Ticket:", ticket,
                     " Price:", ask, " HalfWay:", halfWay, " NewSL:", beSL);
            else
               Print("ERROR [BE SELL]:", trade.ResultRetcode(),
                     " — ", trade.ResultRetcodeDescription());
         }
      }
   }
}

//===================================================================
// HELPER FUNCTIONS
//===================================================================

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

void UpdateDailyTracking()
{
   MqlDateTime now, last;
   TimeToStruct(TimeCurrent(), now);
   TimeToStruct(lastDayTime,   last);
   if(now.day != last.day || now.mon != last.mon || now.year != last.year)
   {
      startDayEquity = AccountInfoDouble(ACCOUNT_EQUITY);
      lastDayTime    = TimeCurrent();
      Print("NEW DAY | Start equity: $", startDayEquity);
   }
}

// Returns false if daily profit target or loss limit is reached
bool CheckDailyLimits()
{
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dailyPL = equity - startDayEquity;

   if(dailyPL >= DailyProfitTarget)
   {
      Print("PROFIT TARGET HIT: +$", DoubleToString(dailyPL, 2),
            " >= $", DailyProfitTarget, ". Done for today.");
      return false;
   }
   if(dailyPL <= -DailyLossLimit)
   {
      Print("LOSS LIMIT HIT: -$", DoubleToString(MathAbs(dailyPL), 2),
            " >= $", DailyLossLimit, ". Stopped for today.");
      return false;
   }
   return true;
}

double GetLowestLow(int startBar, int count)
{
   double v, lowest = DBL_MAX;
   for(int i = startBar; i < startBar + count; i++)
   {
      v = iLow(_Symbol, PERIOD_M1, i);
      if(v < lowest) lowest = v;
   }
   return (lowest == DBL_MAX) ? 0 : lowest;
}

double GetHighestHigh(int startBar, int count)
{
   double v, highest = -DBL_MAX;
   for(int i = startBar; i < startBar + count; i++)
   {
      v = iHigh(_Symbol, PERIOD_M1, i);
      if(v > highest) highest = v;
   }
   return (highest == -DBL_MAX) ? 0 : highest;
}

//===================================================================
// BACKTEST METRICS
//===================================================================
double OnTester()
{
   double trades       = TesterStatistics(STAT_TRADES);
   double profitFactor = TesterStatistics(STAT_PROFIT_FACTOR);
   double maxDDPct     = TesterStatistics(STAT_EQUITY_DDREL_PERCENT);
   double profitTrades = TesterStatistics(STAT_PROFIT_TRADES);
   double lossTrades   = TesterStatistics(STAT_LOSS_TRADES);
   double winRate      = (trades > 0) ? (profitTrades / trades) * 100.0 : 0;
   double expectancy   = TesterStatistics(STAT_EXPECTED_PAYOFF);
   double sharpe       = TesterStatistics(STAT_SHARPE_RATIO);
   double netProfit    = TesterStatistics(STAT_PROFIT);
   double avgWin       = (profitTrades > 0) ?
                         TesterStatistics(STAT_GROSS_PROFIT) / profitTrades : 0;
   double avgLoss      = (lossTrades > 0) ?
                         MathAbs(TesterStatistics(STAT_GROSS_LOSS) / lossTrades) : 0;

   Print("========== BACKTEST RESULTS ==========");
   Print("Total Trades:  ", (int)trades);
   Print("Win Rate:      ", DoubleToString(winRate, 1), "%");
   Print("Profit Factor: ", DoubleToString(profitFactor, 2));
   Print("Net Profit:    $", DoubleToString(netProfit, 2));
   Print("Max Drawdown:  ", DoubleToString(maxDDPct, 2), "%");
   Print("Expectancy:    $", DoubleToString(expectancy, 2));
   Print("Avg Win:       $", DoubleToString(avgWin, 2));
   Print("Avg Loss:      $", DoubleToString(avgLoss, 2));
   Print("Win/Loss Ratio:", (avgLoss > 0) ?
                            DoubleToString(avgWin / avgLoss, 2) : "N/A");
   Print("Sharpe Ratio:  ", DoubleToString(sharpe, 2));
   Print("======================================");

   if(trades < 30)     return 0;
   if(expectancy <= 0) return 0;
   if(maxDDPct > 20.0) return 0;

   return (profitFactor * winRate * expectancy) / MathMax(maxDDPct, 0.1);
}
//+------------------------------------------------------------------+
