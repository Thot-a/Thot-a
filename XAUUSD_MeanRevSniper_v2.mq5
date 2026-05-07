//+------------------------------------------------------------------+
//|                      XAUUSD_MeanRevSniper_v2.mq5                 |
//|     M1 Mean Reversion Sniper — Full Structural Redesign           |
//|                                                                    |
//|  Strategy Identity: Trend-Confirmed Microstructure Mean Reversion  |
//|  Edge: BB 2.5σ extreme + 5-bar liquidity sweep + rejection close   |
//|  Exit: ATR-based SL | Enforced 1:1.5 RR | Candle trail after BE   |
//|  Protection: 9-layer filter system | Dynamic risk sizing           |
//+------------------------------------------------------------------+
#property copyright "Mean Reversion Sniper EA v2"
#property version   "2.00"
#property strict

#include <Trade\Trade.mqh>

//===================================================================
// INPUT PARAMETERS
//===================================================================

input group "=== Risk Management ==="
input double  RiskPercent         = 1.0;   // % risk per trade
input double  DailyProfitTarget   = 10.0;  // Stop at +$10 daily profit
input double  DailyLossLimit      =  6.0;  // Stop at -$6 daily loss
input double  MaxGlobalDDPct      = 15.0;  // Hard stop: total equity DD %

input group "=== RR & Exit ==="
input double  RRRatio             = 1.5;   // Minimum Risk:Reward ratio
input int     BEOffset            = 10;    // Breakeven offset (points)

input group "=== ATR Stop Loss ==="
input int     ATRPeriod           = 14;
input double  ATRMultiplier       = 1.2;   // ATR x multiplier = SL
input int     MinSLPoints         = 80;    // SL floor (points)
input int     MaxSLPoints         = 200;   // SL ceiling - void if exceeded

input group "=== Signal Quality Filters ==="
input int     MaxSpread           = 20;    // Max spread (points)
input int     MinATRPoints        = 40;    // Min ATR - skip flat/dead markets
input int     MaxATRPoints        = 300;   // Max ATR - skip news/spike conditions

input group "=== Volatility / Ranging Filter ==="
input int     MinBBWidthPoints    = 80;    // Min BB width - skip tight ranges

input group "=== Higher Timeframe Trend Filter ==="
input int     HTFEMAPeriod        = 50;    // M5 EMA period for macro direction
input bool    UseHTFFilter        = true;  // Enable M5 trend alignment

input group "=== Trade Frequency Control ==="
input int     MaxDailyTrades      = 3;     // Max trades per calendar day
input int     MaxHourlyTrades     = 1;     // Max trades per clock hour
input int     MinGapMinutes       = 15;    // Min minutes between trade entries

input group "=== Loss Streak Protection ==="
input int     MaxConsecLosses     = 3;     // Pause after N consecutive losses
input int     LossStreakPauseMins = 30;    // Pause duration in minutes

input group "=== News Blackout (Manual) ==="
input bool    UseNewsBlackout     = false; // Enable manual news block
input string  NewsBlackoutStart   = "13:25"; // Server time HH:MM
input string  NewsBlackoutEnd     = "14:00"; // Server time HH:MM

input group "=== Indicator Settings ==="
input int     EMAPeriod           = 200;
input int     BBPeriod            = 20;
input double  BBDeviation         = 2.5;
input int     LookbackPeriod      = 5;

input group "=== Session Filter (RoboForex GMT+3 server) ==="
input int     LondonOpen          = 11;    // 08:00 GMT
input int     LondonClose         = 15;    // 12:00 GMT
input int     NYOpen              = 16;    // 13:00 GMT
input int     NYClose             = 20;    // 17:00 GMT
input bool    NoFridayTrades      = true;

input group "=== EA Identity ==="
input int     MagicNumber         = 202404;

//===================================================================
// GLOBAL STATE
//===================================================================
CTrade   trade;
int      emaHandle;
int      bbHandle;
int      atrHandle;
int      htfEmaHandle;

double   startDayEquity;
double   initialEquity;
datetime lastDayTime;
datetime lastBarTime;
datetime lastTradeTime;
datetime lossStreakPauseUntil;
datetime lastHourTime;
int      dailyTradeCount;
int      hourlyTradeCount;

//===================================================================
// INITIALIZATION
//===================================================================
int OnInit()
{
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(30);
   trade.SetTypeFilling(ORDER_FILLING_RETURN);

   emaHandle    = iMA   (_Symbol, PERIOD_M1, EMAPeriod,    0, MODE_EMA, PRICE_CLOSE);
   bbHandle     = iBands(_Symbol, PERIOD_M1, BBPeriod,     0, BBDeviation, PRICE_CLOSE);
   atrHandle    = iATR  (_Symbol, PERIOD_M1, ATRPeriod);
   htfEmaHandle = iMA   (_Symbol, PERIOD_M5, HTFEMAPeriod, 0, MODE_EMA, PRICE_CLOSE);

   if(emaHandle    == INVALID_HANDLE ||
      bbHandle     == INVALID_HANDLE ||
      atrHandle    == INVALID_HANDLE ||
      htfEmaHandle == INVALID_HANDLE)
   {
      Print("ERROR [OnInit]: Indicator handle creation failed.");
      return INIT_FAILED;
   }

   startDayEquity       = AccountInfoDouble(ACCOUNT_EQUITY);
   initialEquity        = AccountInfoDouble(ACCOUNT_EQUITY);
   lastDayTime          = TimeCurrent();
   lastBarTime          = 0;
   lastTradeTime        = 0;
   lossStreakPauseUntil = 0;
   lastHourTime         = 0;
   dailyTradeCount      = 0;
   hourlyTradeCount     = 0;

   Print("=== Mean Reversion Sniper v2 Initialized ===");
   Print("Risk: ", RiskPercent, "% | DailyTarget: +$", DailyProfitTarget,
         " | DailyLimit: -$", DailyLossLimit,
         " | GlobalDD: ", MaxGlobalDDPct, "%");
   Print("Filters: Session | Spread(", MaxSpread, ") | ATR(",
         MinATRPoints, "-", MaxATRPoints, ") | HTF(M5 EMA", HTFEMAPeriod, ")");
   Print("Frequency: Max ", MaxDailyTrades, "/day | ", MaxHourlyTrades,
         "/hour | Gap:", MinGapMinutes, "min");
   Print("Loss streak pause after ", MaxConsecLosses,
         " losses for ", LossStreakPauseMins, " minutes");

   return INIT_SUCCEEDED;
}

//===================================================================
// DEINITIALIZATION
//===================================================================
void OnDeinit(const int reason)
{
   IndicatorRelease(emaHandle);
   IndicatorRelease(bbHandle);
   IndicatorRelease(atrHandle);
   IndicatorRelease(htfEmaHandle);
   Print("EA Deinitialized | Reason:", reason);
}

//===================================================================
// MAIN TICK
//===================================================================
void OnTick()
{
   UpdateDailyTracking();
   ManageBreakeven();

   datetime currentBarTime = iTime(_Symbol, PERIOD_M1, 0);
   if(currentBarTime == lastBarTime) return;
   lastBarTime = currentBarTime;

   ManageTrailingStop();
   UpdateHourlyCount();

   // --- LAYER 1: Global equity protection ---
   if(!CheckGlobalEquity()) return;

   // --- LAYER 2: Daily profit/loss limits ---
   if(!CheckDailyLimits()) return;

   // --- LAYER 3: Trade frequency gates ---
   if(dailyTradeCount >= MaxDailyTrades)
   {
      Print("INFO: Daily limit (", MaxDailyTrades, ") reached.");
      return;
   }
   if(hourlyTradeCount >= MaxHourlyTrades) return;

   // --- LAYER 4: Single position rule ---
   if(HasOpenPosition()) return;

   // --- LAYER 5: Loss streak protection ---
   if(IsLossStreakPaused()) return;

   // --- LAYER 6: Session + calendar filters ---
   if(!IsInSession())     return;
   if(IsFridayBlocked())  return;
   if(IsInNewsBlackout()) return;

   // --- LAYER 7: Minimum time gap between trades ---
   if(lastTradeTime > 0 &&
      TimeCurrent() - lastTradeTime < MinGapMinutes * 60) return;

   // --- LAYER 8: Spread check ---
   long spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spread > MaxSpread)
   {
      Print("SKIP [Spread]:", spread, " pts (max:", MaxSpread, ")");
      return;
   }

   // Indicator buffers — bar 1 = last confirmed closed bar
   // BB buffers: 0=Middle, 1=Upper, 2=Lower
   double emaVal[], atrVal[], bbMid[], bbUpper[], bbLower[], htfEma[];
   ArraySetAsSeries(emaVal,  true);
   ArraySetAsSeries(atrVal,  true);
   ArraySetAsSeries(bbMid,   true);
   ArraySetAsSeries(bbUpper, true);
   ArraySetAsSeries(bbLower, true);
   ArraySetAsSeries(htfEma,  true);

   if(CopyBuffer(emaHandle,    0, 0, 3, emaVal)  < 3) return;
   if(CopyBuffer(atrHandle,    0, 0, 3, atrVal)  < 3) return;
   if(CopyBuffer(bbHandle,     0, 0, 3, bbMid)   < 3) return;
   if(CopyBuffer(bbHandle,     1, 0, 3, bbUpper) < 3) return;
   if(CopyBuffer(bbHandle,     2, 0, 3, bbLower) < 3) return;
   if(CopyBuffer(htfEmaHandle, 0, 0, 2, htfEma)  < 2) return;

   double ema       = emaVal[1];
   double atr       = atrVal[1];
   double midBand   = bbMid[1];
   double upperBand = bbUpper[1];
   double lowerBand = bbLower[1];
   double htfEmaVal = htfEma[0];

   // --- LAYER 9: Volatility envelope ---
   if(atr < MinATRPoints * _Point) return;
   if(atr > MaxATRPoints * _Point)
   {
      Print("SKIP [ATR spike]:", DoubleToString(atr/_Point, 0), " pts");
      return;
   }

   // BB width filter — avoid tight ranging conditions
   if((upperBand - lowerBand) < MinBBWidthPoints * _Point) return;

   double close1 = iClose(_Symbol, PERIOD_M1, 1);
   double high1  = iHigh (_Symbol, PERIOD_M1, 1);
   double low1   = iLow  (_Symbol, PERIOD_M1, 1);

   double lowestLow   = GetLowestLow  (2, LookbackPeriod);
   double highestHigh = GetHighestHigh(2, LookbackPeriod);
   if(lowestLow <= 0 || highestHigh <= 0) return;

   // ATR-based SL — dynamic and market-calibrated
   double rawSL  = atr * ATRMultiplier;
   double slDist = MathMax(MinSLPoints * _Point,
                   MathMin(MaxSLPoints * _Point, rawSL));

   double minStop  = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;

   // HTF context — M5 price vs M5 EMA
   double htfPrice  = iClose(_Symbol, PERIOD_M5, 0);
   bool   htfBull   = (htfPrice > htfEmaVal);
   bool   htfBear   = (htfPrice < htfEmaVal);

   // ================================================================
   // BUY SETUP — All 5 conditions required
   //
   // 1. M1 close > EMA 200         -> M1 uptrend confirmed
   // 2. M5 price > M5 EMA 50       -> Macro bullish alignment
   // 3. low pierced Lower BB       -> Volatility extreme reached
   // 4. low swept 5-bar LowestLow  -> Liquidity grab confirmed
   // 5. close reclaimed Lower BB   -> Institutional rejection
   // ================================================================
   bool m1Bull    = (close1 > ema);
   bool htfOk_Buy = (!UseHTFFilter || htfBull);
   bool bullSweep = (low1 < lowerBand && low1 < lowestLow && close1 > lowerBand);

   if(m1Bull && htfOk_Buy && bullSweep)
   {
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);

      if(slDist > MaxSLPoints * _Point)
      {
         Print("VOID BUY: SL=", DoubleToString(slDist/_Point, 0), " > max");
         return;
      }

      double sl = NormalizeDouble(ask - slDist, _Digits);

      // TP = farther of (RR-enforced) vs (Middle BB)
      // Enforces minimum 1:RRRatio while respecting mean reversion target
      double rrTP   = ask + slDist * RRRatio;
      double tp     = NormalizeDouble(MathMax(rrTP, midBand), _Digits);
      double tpDist = tp - ask;
      double actualRR = tpDist / slDist;

      if(tp <= ask)         { Print("VOID BUY: TP below entry."); return; }
      if(ask-sl  < minStop) { Print("VOID BUY: SL too close to broker min."); return; }
      if(tp -ask < minStop) { Print("VOID BUY: TP too close to broker min."); return; }

      double lots    = CalculateLotSize(slDist);
      if(lots <= 0) return;

      string comment = StringFormat("MRS BUY|%.5f", slDist);

      if(trade.Buy(lots, _Symbol, ask, sl, tp, comment))
      {
         dailyTradeCount++;
         hourlyTradeCount++;
         lastTradeTime = TimeCurrent();
         Print("BUY | Entry:", ask,
               " SL:", sl, "(", DoubleToString(slDist/_Point, 0), "pts)",
               " TP:", tp, " RR:1:", DoubleToString(actualRR, 2),
               " Lots:", lots,
               " ATR:", DoubleToString(atr/_Point, 1), "pts",
               " Spread:", spread);
      }
      else
         Print("ERROR [BUY]:", trade.ResultRetcode(),
               " - ", trade.ResultRetcodeDescription());
   }

   // ================================================================
   // SELL SETUP — All 5 conditions required
   //
   // 1. M1 close < EMA 200          -> M1 downtrend confirmed
   // 2. M5 price < M5 EMA 50        -> Macro bearish alignment
   // 3. high pierced Upper BB       -> Volatility extreme reached
   // 4. high swept 5-bar HighHigh   -> Liquidity grab confirmed
   // 5. close fell below Upper BB   -> Institutional rejection
   // ================================================================
   bool m1Bear     = (close1 < ema);
   bool htfOk_Sell = (!UseHTFFilter || htfBear);
   bool bearSweep  = (high1 > upperBand && high1 > highestHigh && close1 < upperBand);

   if(m1Bear && htfOk_Sell && bearSweep)
   {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);

      if(slDist > MaxSLPoints * _Point)
      {
         Print("VOID SELL: SL=", DoubleToString(slDist/_Point, 0), " > max");
         return;
      }

      double sl = NormalizeDouble(bid + slDist, _Digits);

      // TP = farther below entry: RR-enforced vs Middle BB
      double rrTP   = bid - slDist * RRRatio;
      double tp     = NormalizeDouble(MathMin(rrTP, midBand), _Digits);
      double tpDist = bid - tp;
      double actualRR = tpDist / slDist;

      if(tp >= bid)         { Print("VOID SELL: TP above entry."); return; }
      if(sl -bid < minStop) { Print("VOID SELL: SL too close to broker min."); return; }
      if(bid-tp  < minStop) { Print("VOID SELL: TP too close to broker min."); return; }

      double lots    = CalculateLotSize(slDist);
      if(lots <= 0) return;

      string comment = StringFormat("MRS SELL|%.5f", slDist);

      if(trade.Sell(lots, _Symbol, bid, sl, tp, comment))
      {
         dailyTradeCount++;
         hourlyTradeCount++;
         lastTradeTime = TimeCurrent();
         Print("SELL | Entry:", bid,
               " SL:", sl, "(", DoubleToString(slDist/_Point, 0), "pts)",
               " TP:", tp, " RR:1:", DoubleToString(actualRR, 2),
               " Lots:", lots,
               " ATR:", DoubleToString(atr/_Point, 1), "pts",
               " Spread:", spread);
      }
      else
         Print("ERROR [SELL]:", trade.ResultRetcode(),
               " - ", trade.ResultRetcodeDescription());
   }
}

//===================================================================
// BREAKEVEN — every tick
// Triggers at 1:1 RR (SL distance covered in our favor)
//===================================================================
void ManageBreakeven()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket))               continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)     continue;

      double entry  = PositionGetDouble(POSITION_PRICE_OPEN);
      double curSL  = PositionGetDouble(POSITION_SL);
      double curTP  = PositionGetDouble(POSITION_TP);
      double slDist = GetSLFromComment(PositionGetString(POSITION_COMMENT));
      if(slDist <= 0) continue;

      ENUM_POSITION_TYPE type =
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double pt = _Point;

      if(type == POSITION_TYPE_BUY)
      {
         double bid     = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double trigger = entry + slDist;
         double beSL    = NormalizeDouble(entry + BEOffset * pt, _Digits);
         if(bid >= trigger && curSL < beSL - pt)
         {
            if(trade.PositionModify(ticket, beSL, curTP))
               Print("BE [BUY] Ticket:", ticket, " NewSL:", beSL);
            else
               Print("ERROR [BE BUY]:", trade.ResultRetcode());
         }
      }
      else if(type == POSITION_TYPE_SELL)
      {
         double ask     = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double trigger = entry - slDist;
         double beSL    = NormalizeDouble(entry - BEOffset * pt, _Digits);
         if(ask <= trigger && curSL > beSL + pt)
         {
            if(trade.PositionModify(ticket, beSL, curTP))
               Print("BE [SELL] Ticket:", ticket, " NewSL:", beSL);
            else
               Print("ERROR [BE SELL]:", trade.ResultRetcode());
         }
      }
   }
}

//===================================================================
// TRAILING STOP — bar-close only, activates after breakeven
//===================================================================
void ManageTrailingStop()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket))               continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)     continue;

      double entry  = PositionGetDouble(POSITION_PRICE_OPEN);
      double curSL  = PositionGetDouble(POSITION_SL);
      double curTP  = PositionGetDouble(POSITION_TP);
      double slDist = GetSLFromComment(PositionGetString(POSITION_COMMENT));
      if(slDist <= 0) continue;

      ENUM_POSITION_TYPE type =
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double pt = _Point;

      if(type == POSITION_TYPE_BUY)
      {
         double beSL = NormalizeDouble(entry + BEOffset * pt, _Digits);
         if(curSL < beSL - pt) continue;

         double bid     = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double trailSL = NormalizeDouble(
            MathMin(iLow(_Symbol, PERIOD_M1, 1),
                    iLow(_Symbol, PERIOD_M1, 2)), _Digits);

         if(trailSL > curSL + pt && trailSL < bid - pt)
         {
            if(trade.PositionModify(ticket, trailSL, curTP))
               Print("TRAIL [BUY] Ticket:", ticket, " SL:", trailSL);
            else
               Print("ERROR [TRAIL BUY]:", trade.ResultRetcode());
         }
      }
      else if(type == POSITION_TYPE_SELL)
      {
         double beSL = NormalizeDouble(entry - BEOffset * pt, _Digits);
         if(curSL > beSL + pt) continue;

         double ask     = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double trailSL = NormalizeDouble(
            MathMax(iHigh(_Symbol, PERIOD_M1, 1),
                    iHigh(_Symbol, PERIOD_M1, 2)), _Digits);

         if(trailSL < curSL - pt && trailSL > ask + pt)
         {
            if(trade.PositionModify(ticket, trailSL, curTP))
               Print("TRAIL [SELL] Ticket:", ticket, " SL:", trailSL);
            else
               Print("ERROR [TRAIL SELL]:", trade.ResultRetcode());
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

bool IsInSession()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int h = dt.hour;
   return (h >= LondonOpen && h < LondonClose) ||
          (h >= NYOpen     && h < NYClose);
}

bool IsFridayBlocked()
{
   if(!NoFridayTrades) return false;
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   return (dt.day_of_week == 5);
}

bool IsInNewsBlackout()
{
   if(!UseNewsBlackout) return false;
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   string now = StringFormat("%02d:%02d", dt.hour, dt.min);
   return (now >= NewsBlackoutStart && now <= NewsBlackoutEnd);
}

bool IsLossStreakPaused()
{
   if(TimeCurrent() < lossStreakPauseUntil)
   {
      Print("INFO: Loss streak pause active until ",
            TimeToString(lossStreakPauseUntil, TIME_MINUTES));
      return true;
   }
   int losses = CountConsecutiveLosses();
   if(losses >= MaxConsecLosses)
   {
      lossStreakPauseUntil = TimeCurrent() + LossStreakPauseMins * 60;
      Print("LOSS STREAK: ", losses, " consecutive losses. Pausing ",
            LossStreakPauseMins, " min until ",
            TimeToString(lossStreakPauseUntil, TIME_MINUTES));
      return true;
   }
   return false;
}

int CountConsecutiveLosses()
{
   if(!HistorySelect(TimeCurrent() - 7 * 86400, TimeCurrent())) return 0;
   int streak = 0;
   int total  = HistoryDealsTotal();

   for(int i = total - 1; i >= 0; i--)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC)  != MagicNumber)    continue;
      if(HistoryDealGetString (ticket, DEAL_SYMBOL) != _Symbol)        continue;
      if(HistoryDealGetInteger(ticket, DEAL_ENTRY)  != DEAL_ENTRY_OUT) continue;

      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT)
                    + HistoryDealGetDouble(ticket, DEAL_SWAP)
                    + HistoryDealGetDouble(ticket, DEAL_COMMISSION);

      if(profit < 0)
         streak++;
      else
         break;
   }
   return streak;
}

void UpdateDailyTracking()
{
   MqlDateTime now, last;
   TimeToStruct(TimeCurrent(), now);
   TimeToStruct(lastDayTime,   last);
   if(now.day != last.day || now.mon != last.mon || now.year != last.year)
   {
      startDayEquity  = AccountInfoDouble(ACCOUNT_EQUITY);
      lastDayTime     = TimeCurrent();
      dailyTradeCount = 0;
      Print("NEW DAY | Start equity: $", startDayEquity);
   }
}

void UpdateHourlyCount()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   datetime thisHour = TimeCurrent() - dt.min * 60 - dt.sec;
   if(thisHour != lastHourTime)
   {
      hourlyTradeCount = 0;
      lastHourTime     = thisHour;
   }
}

bool CheckGlobalEquity()
{
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double ddPct  = (initialEquity - equity) / initialEquity * 100.0;
   if(ddPct >= MaxGlobalDDPct)
   {
      Print("GLOBAL DD LIMIT: ", DoubleToString(ddPct, 2),
            "% >= ", MaxGlobalDDPct, "%. EA halted.");
      return false;
   }
   return true;
}

bool CheckDailyLimits()
{
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dailyPL = equity - startDayEquity;

   if(dailyPL >= DailyProfitTarget)
   {
      Print("PROFIT TARGET: +$", DoubleToString(dailyPL, 2), ". Done today.");
      return false;
   }
   if(dailyPL <= -DailyLossLimit)
   {
      Print("LOSS LIMIT: -$", DoubleToString(MathAbs(dailyPL), 2), ". Stopped.");
      return false;
   }
   return true;
}

double CalculateLotSize(double slDist)
{
   if(slDist <= 0) return 0;
   double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmt   = balance * RiskPercent / 100.0;
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   if(tickSize <= 0 || tickValue <= 0) return 0;
   double lots = riskAmt / ((slDist / tickSize) * tickValue);
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double step   = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   lots = MathFloor(lots / step) * step;
   lots = MathMax(minLot, MathMin(maxLot, lots));
   return NormalizeDouble(lots, 2);
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

double GetSLFromComment(string comment)
{
   int sep = StringFind(comment, "|");
   if(sep < 0) return 0;
   return StringToDouble(StringSubstr(comment, sep + 1));
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
   double breakevenWR  = (avgWin + avgLoss > 0) ?
                         avgLoss / (avgWin + avgLoss) * 100.0 : 0;

   Print("========== BACKTEST RESULTS v2 ==========");
   Print("Total Trades:     ", (int)trades);
   Print("Win Rate:         ", DoubleToString(winRate,      1), "%");
   Print("Break-even WR:    ", DoubleToString(breakevenWR,  1), "% (must exceed this)");
   Print("Profit Factor:    ", DoubleToString(profitFactor, 2));
   Print("Net Profit:       $", DoubleToString(netProfit,   2));
   Print("Max Drawdown:     ", DoubleToString(maxDDPct,     2), "%");
   Print("Expectancy/Trade: $", DoubleToString(expectancy,  2));
   Print("Avg Win:          $", DoubleToString(avgWin,      2));
   Print("Avg Loss:         $", DoubleToString(avgLoss,     2));
   Print("Win/Loss Ratio:   ", (avgLoss > 0) ?
                               DoubleToString(avgWin/avgLoss, 2) : "N/A");
   Print("Sharpe Ratio:     ", DoubleToString(sharpe,       2));
   Print("=========================================");

   if(trades < 20)     return 0;
   if(expectancy <= 0) return 0;
   if(maxDDPct > 20.0) return 0;

   return (profitFactor * winRate * expectancy) / MathMax(maxDDPct, 0.1);
}
//+------------------------------------------------------------------+
