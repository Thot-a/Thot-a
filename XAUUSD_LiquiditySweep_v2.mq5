//+------------------------------------------------------------------+
//|                              XAUUSD_LiquiditySweep_v2.mq5       |
//|              Gold Scalper v2 — Liquidity Sweep Strategy          |
//|   M5 | London + NY Sessions | ATR SL | Bar-Based Trail           |
//|   Designed for: RoboForex, XAUUSD, small accounts ($200+)        |
//+------------------------------------------------------------------+
#property copyright "Liquidity Sweep EA v2"
#property version   "2.00"
#property strict

#include <Trade\Trade.mqh>

//===================================================================
// INPUT PARAMETERS
//===================================================================

input group "=== Risk Management ==="
input double  RiskPercent    = 0.5;   // Risk % per trade (0.5% = $1 on $200)
input double  DailyDDLimit   = 3.0;   // Max daily loss % before halting
input int     MaxDailyTrades = 3;     // Max trades per day (quality over quantity)

input group "=== EMA Trend Filter ==="
input int     EMAPeriod      = 200;   // EMA period
input double  EMATrendBuffer = 0.1;   // Min ATR distance from EMA (trend conviction)

input group "=== ATR Stop Loss ==="
input int     ATRPeriod      = 14;    // ATR calculation period
input double  ATRMultiplier  = 1.5;   // ATR × multiplier = raw SL distance
input int     MinSLPoints    = 150;   // SL floor: 150 pts = $1.50 on XAUUSD
input int     MaxSLPoints    = 500;   // SL ceiling: 500 pts = $5.00 on XAUUSD

input group "=== Entry Logic ==="
input int     LookbackPeriod = 5;     // Bars for sweep High/Low detection
input double  RRRatio        = 1.5;   // Risk:Reward ratio for Take Profit
input int     BEOffset       = 10;    // Breakeven offset beyond entry (points)

input group "=== Safety Filters ==="
input int     MaxSpread      = 35;    // Max spread in points before skipping entry

input group "=== Session Filter (Server Time) ==="
// RoboForex server = GMT+3. London 08:00 GMT = 11:00 server.
// New York 13:00 GMT = 16:00 server. Adjust if your broker differs.
input int     LondonOpen     = 11;    // London session open  (server hour)
input int     LondonClose    = 15;    // London session close (server hour)
input int     NYOpen         = 16;    // New York session open  (server hour)
input int     NYClose        = 20;    // New York session close (server hour)
input bool    NoFridayTrades = true;  // Block all new entries on Friday

input group "=== EA Identity ==="
input int     MagicNumber    = 202402;

//===================================================================
// GLOBAL STATE
//===================================================================
CTrade   trade;
int      emaHandle;
int      atrHandle;
double   startDayEquity;
datetime lastDayTime;
datetime lastBarTime;
int      dailyTradeCount;

//===================================================================
// INITIALIZATION
//===================================================================
int OnInit()
{
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(30);
   trade.SetTypeFilling(ORDER_FILLING_RETURN);

   emaHandle = iMA  (_Symbol, PERIOD_M5, EMAPeriod, 0, MODE_EMA, PRICE_CLOSE);
   atrHandle = iATR (_Symbol, PERIOD_M5, ATRPeriod);

   if(emaHandle == INVALID_HANDLE || atrHandle == INVALID_HANDLE)
   {
      Print("ERROR [OnInit]: Indicator handle creation failed.");
      return INIT_FAILED;
   }

   startDayEquity  = AccountInfoDouble(ACCOUNT_EQUITY);
   lastDayTime     = TimeCurrent();
   lastBarTime     = 0;
   dailyTradeCount = 0;

   Print("=== Liquidity Sweep EA v2 Initialized ===");
   Print("Symbol: ",    _Symbol,       " | Magic: ",    MagicNumber);
   Print("Risk: ",      RiskPercent,   "% | Daily DD: ", DailyDDLimit, "%");
   Print("Max Trades/Day: ", MaxDailyTrades);
   Print("Sessions (server): London ", LondonOpen, ":00-", LondonClose,
         ":00 | NY ", NYOpen, ":00-", NYClose, ":00");
   Print("SL Range: ", MinSLPoints, "-", MaxSLPoints, " points");

   return INIT_SUCCEEDED;
}

//===================================================================
// DEINITIALIZATION
//===================================================================
void OnDeinit(const int reason)
{
   IndicatorRelease(emaHandle);
   IndicatorRelease(atrHandle);
   Print("EA Deinitialized | Reason: ", reason);
}

//===================================================================
// MAIN TICK
//===================================================================
void OnTick()
{
   // Always: keep daily state current
   UpdateDailyTracking();

   // Always: breakeven runs every tick for fast response
   ManageBreakeven();

   // New bar gate
   datetime currentBarTime = iTime(_Symbol, PERIOD_M5, 0);
   if(currentBarTime == lastBarTime) return;
   lastBarTime = currentBarTime;

   // On new bar: trail SL using confirmed previous candles
   ManageTrailingStop();

   // -------------------------------------------------------
   // Entry gate checks (ordered cheapest to most expensive)
   // -------------------------------------------------------
   if(!CheckDailyDrawdown())               return;
   if(dailyTradeCount >= MaxDailyTrades)
   {
      Print("INFO: Daily trade limit (", MaxDailyTrades, ") reached.");
      return;
   }
   if(HasOpenPosition())                   return;
   if(!IsInSession())                      return;
   if(IsFridayBlocked())                   return;

   long spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spread > MaxSpread)
   {
      Print("SKIP [Spread]: ", spread, " pts — max allowed: ", MaxSpread);
      return;
   }

   // -------------------------------------------------------
   // Indicator values from last confirmed closed bar (bar 1)
   // -------------------------------------------------------
   double emaVal[], atrVal[];
   ArraySetAsSeries(emaVal, true);
   ArraySetAsSeries(atrVal, true);

   if(CopyBuffer(emaHandle, 0, 0, 3, emaVal) < 3) { Print("ERROR: EMA buffer."); return; }
   if(CopyBuffer(atrHandle, 0, 0, 3, atrVal) < 3) { Print("ERROR: ATR buffer."); return; }

   double ema    = emaVal[1];
   double atr    = atrVal[1];

   if(atr <= 0) { Print("ERROR: ATR = 0. Skipping."); return; }

   double close1 = iClose(_Symbol, PERIOD_M5, 1);
   double high1  = iHigh (_Symbol, PERIOD_M5, 1);
   double low1   = iLow  (_Symbol, PERIOD_M5, 1);

   // -------------------------------------------------------
   // Lookback range: bars 2 to (LookbackPeriod + 1)
   // These are the N bars BEFORE the signal candle
   // -------------------------------------------------------
   double lowestLow   = GetLowestLow  (2, LookbackPeriod);
   double highestHigh = GetHighestHigh(2, LookbackPeriod);
   if(lowestLow <= 0 || highestHigh <= 0) return;

   // -------------------------------------------------------
   // ATR-based SL with hard floor and ceiling
   // Floor: protects against ATR being too small (tight SL = premature stops)
   // Ceiling: protects against high-volatility events blowing out lot size
   // -------------------------------------------------------
   double rawSL  = atr * ATRMultiplier;
   double slDist = MathMax(MinSLPoints * _Point,
                   MathMin(MaxSLPoints * _Point, rawSL));
   double tpDist = slDist * RRRatio;
   double lots   = CalculateLotSize(slDist);

   if(lots <= 0) { Print("ERROR: Lot size = 0. Balance: ", AccountInfoDouble(ACCOUNT_BALANCE)); return; }

   // -------------------------------------------------------
   // EMA conviction buffer: close must clear EMA by (buffer × ATR)
   // Prevents entries when price is just barely crossing EMA
   // -------------------------------------------------------
   double trendBuffer = EMATrendBuffer * atr;

   // -------------------------------------------------------
   // BUY SETUP
   // Trend:  close > EMA + buffer (confirmed bullish)
   // Sweep:  low swept below N-bar LowestLow
   // Reject: close reclaimed back above LowestLow
   // -------------------------------------------------------
   bool bullTrend = (close1 > ema + trendBuffer);
   bool bullSweep = (low1 < lowestLow && close1 > lowestLow);

   if(bullTrend && bullSweep)
   {
      double ask     = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl      = NormalizeDouble(ask - slDist, _Digits);
      double tp      = NormalizeDouble(ask + tpDist, _Digits);
      string comment = StringFormat("LiqSweep BUY|%.5f", slDist);

      if(ValidatePrices(ORDER_TYPE_BUY, ask, sl, tp))
      {
         if(trade.Buy(lots, _Symbol, ask, sl, tp, comment))
         {
            dailyTradeCount++;
            Print("BUY ENTRY | Price:", ask, " SL:", sl, " TP:", tp,
                  " Lots:", lots, " | ATR:", DoubleToString(atr, 5),
                  " SLDist:", DoubleToString(slDist, 5),
                  " Spread:", spread);
         }
         else
            Print("ERROR [BUY]: ", trade.ResultRetcode(),
                  " — ", trade.ResultRetcodeDescription());
      }
   }

   // -------------------------------------------------------
   // SELL SETUP
   // Trend:  close < EMA - buffer (confirmed bearish)
   // Sweep:  high swept above N-bar HighestHigh
   // Reject: close fell back below HighestHigh
   // -------------------------------------------------------
   bool bearTrend = (close1 < ema - trendBuffer);
   bool bearSweep = (high1 > highestHigh && close1 < highestHigh);

   if(bearTrend && bearSweep)
   {
      double bid     = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl      = NormalizeDouble(bid + slDist, _Digits);
      double tp      = NormalizeDouble(bid - tpDist, _Digits);
      string comment = StringFormat("LiqSweep SELL|%.5f", slDist);

      if(ValidatePrices(ORDER_TYPE_SELL, bid, sl, tp))
      {
         if(trade.Sell(lots, _Symbol, bid, sl, tp, comment))
         {
            dailyTradeCount++;
            Print("SELL ENTRY | Price:", bid, " SL:", sl, " TP:", tp,
                  " Lots:", lots, " | ATR:", DoubleToString(atr, 5),
                  " SLDist:", DoubleToString(slDist, 5),
                  " Spread:", spread);
         }
         else
            Print("ERROR [SELL]: ", trade.ResultRetcode(),
                  " — ", trade.ResultRetcodeDescription());
      }
   }
}

//===================================================================
// BREAKEVEN — every tick
// Triggered once price reaches 1:1 RR. Moves SL to entry + offset.
// Uses SL distance stored in comment — no fragile back-calculation.
//===================================================================
void ManageBreakeven()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket))               continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)     continue;

      double entry   = PositionGetDouble(POSITION_PRICE_OPEN);
      double curSL   = PositionGetDouble(POSITION_SL);
      double curTP   = PositionGetDouble(POSITION_TP);
      ENUM_POSITION_TYPE type =
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);

      double slDist = GetSLFromComment(PositionGetString(POSITION_COMMENT));
      if(slDist <= 0) continue;

      double pt = _Point;

      if(type == POSITION_TYPE_BUY)
      {
         double bid     = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double trigger = entry + slDist;                          // 1:1 RR level
         double beSL    = NormalizeDouble(entry + BEOffset * pt, _Digits);

         // Only act once: when price hits 1:1 and SL is still at original level
         if(bid >= trigger && curSL < beSL - pt)
         {
            if(trade.PositionModify(ticket, beSL, curTP))
               Print("BE [BUY] | Ticket:", ticket, " SL moved to:", beSL);
            else
               Print("ERROR [BE BUY]: ", trade.ResultRetcode(),
                     " — ", trade.ResultRetcodeDescription());
         }
      }
      else if(type == POSITION_TYPE_SELL)
      {
         double ask     = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double trigger = entry - slDist;                          // 1:1 RR level
         double beSL    = NormalizeDouble(entry - BEOffset * pt, _Digits);

         if(ask <= trigger && curSL > beSL + pt)
         {
            if(trade.PositionModify(ticket, beSL, curTP))
               Print("BE [SELL] | Ticket:", ticket, " SL moved to:", beSL);
            else
               Print("ERROR [BE SELL]: ", trade.ResultRetcode(),
                     " — ", trade.ResultRetcodeDescription());
         }
      }
   }
}

//===================================================================
// TRAILING STOP — new bar only
// Activates only AFTER breakeven is set.
// Trails at the Low[1]/Low[2] for buys, High[1]/High[2] for sells.
// Only ever tightens — never widens.
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
      ENUM_POSITION_TYPE type =
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);

      double slDist = GetSLFromComment(PositionGetString(POSITION_COMMENT));
      if(slDist <= 0) continue;

      double pt  = _Point;
      double beSL;

      if(type == POSITION_TYPE_BUY)
      {
         beSL = NormalizeDouble(entry + BEOffset * pt, _Digits);

         // Guard: only trail if breakeven is already active
         if(curSL < beSL - pt) continue;

         double bid     = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double trailSL = NormalizeDouble(
            MathMin(iLow(_Symbol, PERIOD_M5, 1),
                    iLow(_Symbol, PERIOD_M5, 2)), _Digits);

         // Move SL up only — must stay below current bid with buffer
         if(trailSL > curSL + pt && trailSL < bid - pt)
         {
            if(trade.PositionModify(ticket, trailSL, curTP))
               Print("TRAIL [BUY] | Ticket:", ticket, " SL:", trailSL);
            else
               Print("ERROR [TRAIL BUY]: ", trade.ResultRetcode(),
                     " — ", trade.ResultRetcodeDescription());
         }
      }
      else if(type == POSITION_TYPE_SELL)
      {
         beSL = NormalizeDouble(entry - BEOffset * pt, _Digits);

         // Guard: only trail if breakeven is already active
         if(curSL > beSL + pt) continue;

         double ask     = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double trailSL = NormalizeDouble(
            MathMax(iHigh(_Symbol, PERIOD_M5, 1),
                    iHigh(_Symbol, PERIOD_M5, 2)), _Digits);

         // Move SL down only — must stay above current ask with buffer
         if(trailSL < curSL - pt && trailSL > ask + pt)
         {
            if(trade.PositionModify(ticket, trailSL, curTP))
               Print("TRAIL [SELL] | Ticket:", ticket, " SL:", trailSL);
            else
               Print("ERROR [TRAIL SELL]: ", trade.ResultRetcode(),
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

// London: 08:00–12:00 GMT | New York: 13:00–17:00 GMT
// Default inputs are set for RoboForex (GMT+3 server).
bool IsInSession()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int h = dt.hour;
   return (h >= LondonOpen && h < LondonClose) ||
          (h >= NYOpen     && h < NYClose);
}

// Block all new entries on Friday to avoid weekend gap exposure
bool IsFridayBlocked()
{
   if(!NoFridayTrades) return false;
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   return (dt.day_of_week == 5);
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
      Print("NEW DAY | Start equity: ", startDayEquity,
            " | Trade counter reset.");
   }
}

bool CheckDailyDrawdown()
{
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double ddPct  = (startDayEquity - equity) / startDayEquity * 100.0;
   if(ddPct >= DailyDDLimit)
   {
      Print("DAILY DD LIMIT | Loss: ", DoubleToString(ddPct, 2),
            "% >= ", DailyDDLimit, "%. No new entries today.");
      return false;
   }
   return true;
}

// Lot size = risk amount / monetary value of SL distance per lot
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
      v = iLow(_Symbol, PERIOD_M5, i);
      if(v < lowest) lowest = v;
   }
   return (lowest == DBL_MAX) ? 0 : lowest;
}

double GetHighestHigh(int startBar, int count)
{
   double v, highest = -DBL_MAX;
   for(int i = startBar; i < startBar + count; i++)
   {
      v = iHigh(_Symbol, PERIOD_M5, i);
      if(v > highest) highest = v;
   }
   return (highest == -DBL_MAX) ? 0 : highest;
}

// Parse original SL distance from comment: "LiqSweep BUY|1.23456"
double GetSLFromComment(string comment)
{
   int sep = StringFind(comment, "|");
   if(sep < 0) return 0;
   return StringToDouble(StringSubstr(comment, sep + 1));
}

// Validate SL/TP are on the correct side and meet broker stop-level
bool ValidatePrices(ENUM_ORDER_TYPE type, double price, double sl, double tp)
{
   double minStop = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;

   if(type == ORDER_TYPE_BUY)
   {
      if(sl >= price)           { Print("INVALID [BUY]: SL >= price"); return false; }
      if(tp <= price)           { Print("INVALID [BUY]: TP <= price"); return false; }
      if(price - sl < minStop)  { Print("INVALID [BUY]: SL within broker min stop (", minStop, ")"); return false; }
      if(tp - price < minStop)  { Print("INVALID [BUY]: TP within broker min stop (", minStop, ")"); return false; }
   }
   else
   {
      if(sl <= price)           { Print("INVALID [SELL]: SL <= price"); return false; }
      if(tp >= price)           { Print("INVALID [SELL]: TP >= price"); return false; }
      if(sl - price < minStop)  { Print("INVALID [SELL]: SL within broker min stop (", minStop, ")"); return false; }
      if(price - tp < minStop)  { Print("INVALID [SELL]: TP within broker min stop (", minStop, ")"); return false; }
   }
   return true;
}

//===================================================================
// BACKTESTING METRICS
// Returns a custom optimization score.
// Penalizes low trade count, excessive drawdown, and negative expectancy.
//===================================================================
double OnTester()
{
   double trades       = TesterStatistics(STAT_TRADES);
   double profitFactor = TesterStatistics(STAT_PROFIT_FACTOR);
   double maxDDPct     = TesterStatistics(STAT_EQUITY_DDREL_PERCENT);
   double profitTrades = TesterStatistics(STAT_PROFIT_TRADES);
   double winRate      = (trades > 0) ? (profitTrades / trades) * 100.0 : 0;
   double expectancy   = TesterStatistics(STAT_EXPECTED_PAYOFF);
   double sharpe       = TesterStatistics(STAT_SHARPE_RATIO);
   double netProfit    = TesterStatistics(STAT_PROFIT);
   double lossTrades   = TesterStatistics(STAT_LOSS_TRADES);
   double avgWin       = (profitTrades > 0) ? TesterStatistics(STAT_GROSS_PROFIT) / profitTrades : 0;
   double avgLoss      = (lossTrades   > 0) ? MathAbs(TesterStatistics(STAT_GROSS_LOSS) / lossTrades) : 0;

   Print("========== BACKTEST RESULTS ==========");
   Print("Total Trades:     ", (int)trades);
   Print("Win Rate:         ", DoubleToString(winRate, 1),        "%");
   Print("Profit Factor:    ", DoubleToString(profitFactor, 2));
   Print("Net Profit:       $", DoubleToString(netProfit, 2));
   Print("Max Drawdown:     ", DoubleToString(maxDDPct, 2),       "%");
   Print("Expectancy/Trade: $", DoubleToString(expectancy, 2));
   Print("Avg Win:          $", DoubleToString(avgWin, 2));
   Print("Avg Loss:         $", DoubleToString(avgLoss, 2));
   Print("Win/Loss Ratio:   ", (avgLoss > 0) ? DoubleToString(avgWin / avgLoss, 2) : "N/A");
   Print("Sharpe Ratio:     ", DoubleToString(sharpe, 2));
   Print("======================================");

   // Disqualify results with insufficient sample size
   if(trades < 30)           return 0;
   // Disqualify if expectancy is negative (losing strategy on average)
   if(expectancy <= 0)       return 0;
   // Disqualify if drawdown is dangerously high for a small account
   if(maxDDPct > 20.0)       return 0;

   // Custom score: rewards high profit factor + win rate, penalizes drawdown
   // Higher score = better risk-adjusted performance
   double score = (profitFactor * winRate * expectancy) / MathMax(maxDDPct, 0.1);
   return score;
}
//+------------------------------------------------------------------+
