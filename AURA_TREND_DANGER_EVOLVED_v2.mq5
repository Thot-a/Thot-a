//+------------------------------------------------------------------+
//|              AURA TREND DANGER EVOLVED v2.00                     |
//|     Advanced Grid EA · Dynamic ATR Step · Soft Partial Close     |
//|         Premium Cyberpunk Block Dashboard · Interactive UI        |
//+------------------------------------------------------------------+
#property copyright "AURA TREND DANGER EVOLVED v2.00"
#property version   "2.00"
#property strict

#include <Trade\Trade.mqh>

//───────────────────────────────────────────────────────────────────
// INPUT PARAMETERS
//───────────────────────────────────────────────────────────────────

input group "═════ EA IDENTITY ═════"
input int             InpMagicNumber       = 88888;
input string          InpEALabel           = "AURA v2";

input group "═════ RISK MANAGEMENT ═════"
input double          InpBaseLot           = 0.01;
input double          InpMaxLot            = 2.00;
input double          InpDailyLossLimit    = 100.0;
input double          InpDailyProfitTarget = 200.0;

input group "═════ GRID SETTINGS ═════"
input double          InpRepairStepPips    = 50.0;
input double          InpLotMultiplier     = 1.5;
input int             InpMaxGridLevels     = 6;

input group "═════ ADVANCED GRID & ATR ═════"
input bool            InpUseDynamicStep    = true;
input int             InpATRPeriod         = 14;
input ENUM_TIMEFRAMES InpATRTimeframe      = PERIOD_CURRENT;
input double          InpATRMultiplier     = 1.5;

input group "═════ PARTIAL CLOSE (SOFT EXIT) ═════"
input bool            InpAutoPartialClose  = true;
input int             InpPartialTriggerPos = 4;
input double          InpPartialTPMoney    = 0.0;

input group "═════ STOP & TRAIL ═════"
input double          InpTP_Pips           = 200.0;
input bool            InpUseTrailingStop   = true;
input double          InpTrailPips         = 30.0;

//───────────────────────────────────────────────────────────────────
// COLOR PALETTE — Cyberpunk Dark Theme
//───────────────────────────────────────────────────────────────────
#define COL_BG_DEEP    C'10,14,20'
#define COL_BG_HEADER  C'8,90,110'
#define COL_BG_ROW     C'18,28,42'
#define COL_BORDER     C'30,55,80'
#define COL_ACCENT     C'0,200,180'
#define COL_ACCENT2    C'30,160,255'
#define COL_DIM        C'75,90,105'
#define COL_TEXT       C'185,205,220'
#define COL_TEXT_HI    C'235,248,255'
#define COL_WARN       C'255,160,20'
#define COL_BULL       C'20,210,110'
#define COL_BEAR       C'240,65,65'
#define COL_GOLD       C'255,205,40'
#define COL_PAUSE_BG   C'55,35,10'
#define COL_TITLE_BG   C'7,85,105'
#define COL_TITLE_BDR  C'0,190,175'
#define COL_MANUAL_BG  C'40,25,5'

//───────────────────────────────────────────────────────────────────
// UI LAYOUT
//───────────────────────────────────────────────────────────────────
#define UI_PFX   "ATD_"
#define PNL_X    16
#define PNL_W    320
#define GAP      5
#define ROW_H    17
#define HDR_H    21
#define BTN_H    22
#define FONT_N   "Consolas"
#define FSZ_H    9
#define FSZ_N    8
#define FSZ_S    7

//───────────────────────────────────────────────────────────────────
// GLOBAL STATE
//───────────────────────────────────────────────────────────────────
CTrade   trade;
int      g_atrHandle        = INVALID_HANDLE;
bool     g_isPaused         = false;
bool     g_autoPartialActive;
double   g_pipSize          = 0.0001;
double   g_startDayEquity   = 0;
double   g_peakEquity       = 0;
datetime g_lastDayTime      = 0;
string   g_log[5];

// Block content Y anchors (set once in CreatePanel)
int      g_yEqContent;
int      g_yPosContent;
int      g_yExitContent;
int      g_yMktContent;
int      g_yActBtns;
int      g_yLogContent;

//═══════════════════════════════════════════════════════════════════
// OnInit
//═══════════════════════════════════════════════════════════════════
int OnInit()
{
   g_pipSize            = (_Digits == 5 || _Digits == 3) ? _Point * 10.0 : _Point;
   g_autoPartialActive  = InpAutoPartialClose;
   g_startDayEquity     = AccountInfoDouble(ACCOUNT_EQUITY);
   g_peakEquity         = g_startDayEquity;
   g_lastDayTime        = TimeCurrent();

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(30);
   trade.SetTypeFilling(ORDER_FILLING_RETURN);

   g_atrHandle = iATR(_Symbol, InpATRTimeframe, InpATRPeriod);
   if(g_atrHandle == INVALID_HANDLE)
   {
      Print("ATD ERROR: iATR handle creation failed.");
      return INIT_FAILED;
   }

   for(int i = 0; i < 5; i++) g_log[i] = "";

   ChartSetInteger(0, CHART_SHOW_GRID,        false);
   ChartSetInteger(0, CHART_COLOR_BACKGROUND, COL_BG_DEEP);

   CreatePanel();
   PushLog("EA v2.00 Initialized");
   UpdatePanel();

   Print("AURA TREND DANGER EVOLVED v2.00 — Ready. Magic:", InpMagicNumber);
   return INIT_SUCCEEDED;
}

//═══════════════════════════════════════════════════════════════════
// OnDeinit
//═══════════════════════════════════════════════════════════════════
void OnDeinit(const int reason)
{
   if(g_atrHandle != INVALID_HANDLE) IndicatorRelease(g_atrHandle);
   ObjectsDeleteAll(0, UI_PFX);
   ChartSetInteger(0, CHART_COLOR_BACKGROUND, clrBlack);
   ChartRedraw(0);
}

//═══════════════════════════════════════════════════════════════════
// OnTick
//═══════════════════════════════════════════════════════════════════
void OnTick()
{
   UpdateDailyTracking();
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(eq > g_peakEquity) g_peakEquity = eq;

   UpdatePanel();

   if(g_isPaused) return;
   if(!CheckDailyLimits()) return;

   ManageTrailingStop();
   ManageExits();
   HandleRepair();
}

//═══════════════════════════════════════════════════════════════════
// OnChartEvent
//═══════════════════════════════════════════════════════════════════
void OnChartEvent(const int id, const long& lparam, const double& dparam, const string& sparam)
{
   if(id != CHARTEVENT_OBJECT_CLICK) return;

   if(sparam == UI_PFX + "BTN_PAUSE")
   {
      g_isPaused = !g_isPaused;
      PlaySound(g_isPaused ? "alert.wav" : "ok.wav");
      PushLog(g_isPaused ? "EA PAUSED" : "EA RESUMED");
      UpdatePanel();
   }
   else if(sparam == UI_PFX + "BTN_CLOSE_BUY")
   {
      int n = CloseAllByType(POSITION_TYPE_BUY);
      PlaySound("ok.wav");
      PushLog(StringFormat("Closed %d BUY(s)", n));
      UpdatePanel();
   }
   else if(sparam == UI_PFX + "BTN_CLOSE_SELL")
   {
      int n = CloseAllByType(POSITION_TYPE_SELL);
      PlaySound("ok.wav");
      PushLog(StringFormat("Closed %d SELL(s)", n));
      UpdatePanel();
   }
   else if(sparam == UI_PFX + "BTN_AP_TOGGLE")
   {
      g_autoPartialActive = !g_autoPartialActive;
      PlaySound("tick.wav");
      PushLog(g_autoPartialActive ? "Auto Partial: ON" : "Auto Partial: OFF");
      UpdatePanel();
   }
   else if(sparam == UI_PFX + "BTN_AP_MANUAL")
   {
      int bc = CountPos(POSITION_TYPE_BUY);
      int sc = CountPos(POSITION_TYPE_SELL);
      ENUM_POSITION_TYPE side = (bc >= sc) ? POSITION_TYPE_BUY : POSITION_TYPE_SELL;
      ProcessPartialClose(side);
      PlaySound("ok.wav");
      PushLog("Manual Partial Fired");
      UpdatePanel();
   }

   ObjectSetInteger(0, sparam, OBJPROP_STATE, false);
   ChartRedraw(0);
}

//═══════════════════════════════════════════════════════════════════
// MANAGE EXITS — Auto Partial Close Trigger (called every tick)
//═══════════════════════════════════════════════════════════════════
void ManageExits()
{
   if(!g_autoPartialActive) return;

   if(CountPos(POSITION_TYPE_BUY)  >= InpPartialTriggerPos)
      ProcessPartialClose(POSITION_TYPE_BUY);

   if(CountPos(POSITION_TYPE_SELL) >= InpPartialTriggerPos)
      ProcessPartialClose(POSITION_TYPE_SELL);
}

//═══════════════════════════════════════════════════════════════════
// PARTIAL CLOSE — Worst + Best position pair on one side
//═══════════════════════════════════════════════════════════════════
void ProcessPartialClose(ENUM_POSITION_TYPE side)
{
   ulong  worstTk = 0,   bestTk = 0;
   double worstPnl = DBL_MAX, bestPnl = -DBL_MAX;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong tk = PositionGetTicket(i);
      if(!PositionSelectByTicket(tk))                                    continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)           continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)                  continue;
      if((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE) != side)  continue;

      double pnl = PositionGetDouble(POSITION_PROFIT)
                 + PositionGetDouble(POSITION_SWAP);

      if(pnl < worstPnl) { worstPnl = pnl; worstTk = tk; }
      if(pnl > bestPnl)  { bestPnl  = pnl; bestTk  = tk; }
   }

   if(worstTk == 0 || bestTk == 0 || worstTk == bestTk) return;

   double netPnl = worstPnl + bestPnl;
   if(netPnl < InpPartialTPMoney) return;

   bool r1 = trade.PositionClose(worstTk);
   bool r2 = trade.PositionClose(bestTk);
   if(r1 || r2)
   {
      string s = (side == POSITION_TYPE_BUY) ? "BUY" : "SELL";
      PushLog(StringFormat("Partial %s Net=$%.2f", s, netPnl));
      Print(StringFormat("ATD Partial [%s] Worst=%I64u Best=%I64u Net=$%.2f", s, worstTk, bestTk, netPnl));
   }
}

//═══════════════════════════════════════════════════════════════════
// HANDLE REPAIR — Dynamic ATR Grid
//═══════════════════════════════════════════════════════════════════
void HandleRepair()
{
   double step = GetATRStep();

   // BUY side grid
   int bc = CountPos(POSITION_TYPE_BUY);
   if(bc > 0 && bc < InpMaxGridLevels)
   {
      double lowestEntry = GetExtremEntry(POSITION_TYPE_BUY, false);
      double bid         = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      if(lowestEntry > 0 && bid <= lowestEntry - step)
      {
         double lots = NextGridLot(POSITION_TYPE_BUY);
         if(lots > 0 && trade.Buy(lots, _Symbol, 0, 0, 0, "ATD-GRID"))
            PushLog(StringFormat("Grid BUY Lv%d %.2flots", bc + 1, lots));
      }
   }

   // SELL side grid
   int sc = CountPos(POSITION_TYPE_SELL);
   if(sc > 0 && sc < InpMaxGridLevels)
   {
      double highestEntry = GetExtremEntry(POSITION_TYPE_SELL, true);
      double ask          = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(highestEntry > 0 && ask >= highestEntry + step)
      {
         double lots = NextGridLot(POSITION_TYPE_SELL);
         if(lots > 0 && trade.Sell(lots, _Symbol, 0, 0, 0, "ATD-GRID"))
            PushLog(StringFormat("Grid SELL Lv%d %.2flots", sc + 1, lots));
      }
   }
}

//═══════════════════════════════════════════════════════════════════
// TRAILING STOP
//═══════════════════════════════════════════════════════════════════
void ManageTrailingStop()
{
   if(!InpUseTrailingStop) return;
   double dist = InpTrailPips * g_pipSize;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong tk = PositionGetTicket(i);
      if(!PositionSelectByTicket(tk))                           continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)  continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)         continue;

      double curSL = PositionGetDouble(POSITION_SL);
      double curTP = PositionGetDouble(POSITION_TP);
      ENUM_POSITION_TYPE t = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);

      if(t == POSITION_TYPE_BUY)
      {
         double bid   = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double newSL = NormalizeDouble(bid - dist, _Digits);
         if(newSL > curSL + _Point)
            trade.PositionModify(tk, newSL, curTP);
      }
      else
      {
         double ask   = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double newSL = NormalizeDouble(ask + dist, _Digits);
         if(curSL == 0 || newSL < curSL - _Point)
            trade.PositionModify(tk, newSL, curTP);
      }
   }
}

//═══════════════════════════════════════════════════════════════════
// HELPERS
//═══════════════════════════════════════════════════════════════════

int CountPos(ENUM_POSITION_TYPE side)
{
   int n = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong tk = PositionGetTicket(i);
      if(!PositionSelectByTicket(tk))                           continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)  continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)         continue;
      if((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE) == side) n++;
   }
   return n;
}

double GetTotalProfit()
{
   double t = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong tk = PositionGetTicket(i);
      if(!PositionSelectByTicket(tk))                           continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)  continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)         continue;
      t += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
   }
   return t;
}

double GetTotalLots()
{
   double t = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong tk = PositionGetTicket(i);
      if(!PositionSelectByTicket(tk))                           continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)  continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)         continue;
      t += PositionGetDouble(POSITION_VOLUME);
   }
   return t;
}

// highest=true → max entry price; false → min entry price
double GetExtremEntry(ENUM_POSITION_TYPE side, bool highest)
{
   double extr = highest ? -DBL_MAX : DBL_MAX;
   bool   found = false;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong tk = PositionGetTicket(i);
      if(!PositionSelectByTicket(tk))                                   continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)          continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)                 continue;
      if((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE) != side) continue;
      double ep = PositionGetDouble(POSITION_PRICE_OPEN);
      if(highest ? ep > extr : ep < extr) { extr = ep; found = true; }
   }
   return found ? extr : 0;
}

double NextGridLot(ENUM_POSITION_TYPE side)
{
   int    lvl  = CountPos(side);
   double lots = InpBaseLot * MathPow(InpLotMultiplier, lvl);
   double maxL = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double minL = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double stp  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   lots = MathMin(lots, MathMin(InpMaxLot, maxL));
   lots = MathMax(lots, minL);
   lots = MathFloor(lots / stp) * stp;
   return NormalizeDouble(lots, 2);
}

double GetATRStep()
{
   if(InpUseDynamicStep && g_atrHandle != INVALID_HANDLE)
   {
      double buf[]; ArraySetAsSeries(buf, true);
      if(CopyBuffer(g_atrHandle, 0, 0, 3, buf) >= 1 && buf[0] > 0)
         return buf[0] * InpATRMultiplier;
   }
   return InpRepairStepPips * g_pipSize;
}

double GetCurrentATR()
{
   if(g_atrHandle == INVALID_HANDLE) return 0;
   double buf[]; ArraySetAsSeries(buf, true);
   if(CopyBuffer(g_atrHandle, 0, 0, 1, buf) < 1) return 0;
   return buf[0];
}

int CloseAllByType(ENUM_POSITION_TYPE side)
{
   int n = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong tk = PositionGetTicket(i);
      if(!PositionSelectByTicket(tk))                                   continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)          continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)                 continue;
      if((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE) != side) continue;
      if(trade.PositionClose(tk)) n++;
   }
   return n;
}

void UpdateDailyTracking()
{
   MqlDateTime now, last;
   TimeToStruct(TimeCurrent(), now);
   TimeToStruct(g_lastDayTime, last);
   if(now.day != last.day || now.mon != last.mon || now.year != last.year)
   {
      g_startDayEquity = AccountInfoDouble(ACCOUNT_EQUITY);
      g_peakEquity     = g_startDayEquity;
      g_lastDayTime    = TimeCurrent();
      PushLog("New Day — Reset counters");
   }
}

bool CheckDailyLimits()
{
   double pnl = AccountInfoDouble(ACCOUNT_EQUITY) - g_startDayEquity;
   if(pnl <= -MathAbs(InpDailyLossLimit))    { PushLog("Daily Loss Limit Hit"); return false; }
   if(pnl >=  MathAbs(InpDailyProfitTarget)) { PushLog("Daily Profit Target!"); return false; }
   return true;
}

void PushLog(string msg)
{
   for(int i = 4; i > 0; i--) g_log[i] = g_log[i - 1];
   g_log[0] = TimeToString(TimeCurrent(), TIME_SECONDS) + "  " + msg;
}

//═══════════════════════════════════════════════════════════════════
// UI PRIMITIVES
//═══════════════════════════════════════════════════════════════════

void Rect(string n, int x, int y, int w, int h, color bg, color bdr, int bw = 1)
{
   if(ObjectFind(0, n) < 0) ObjectCreate(0, n, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, n, OBJPROP_CORNER,     CORNER_LEFT_UPPER);
   ObjectSetInteger(0, n, OBJPROP_XDISTANCE,  x);
   ObjectSetInteger(0, n, OBJPROP_YDISTANCE,  y);
   ObjectSetInteger(0, n, OBJPROP_XSIZE,       w);
   ObjectSetInteger(0, n, OBJPROP_YSIZE,       h);
   ObjectSetInteger(0, n, OBJPROP_BGCOLOR,     bg);
   ObjectSetInteger(0, n, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, n, OBJPROP_COLOR,        bdr);
   ObjectSetInteger(0, n, OBJPROP_WIDTH,        bw);
   ObjectSetInteger(0, n, OBJPROP_BACK,         true);
   ObjectSetInteger(0, n, OBJPROP_SELECTABLE,   false);
}

void Lbl(string n, string txt, int x, int y, color clr, int fs = FSZ_N)
{
   if(ObjectFind(0, n) < 0) ObjectCreate(0, n, OBJ_LABEL, 0, 0, 0);
   ObjectSetString(0, n,  OBJPROP_TEXT,       txt);
   ObjectSetString(0, n,  OBJPROP_FONT,       FONT_N);
   ObjectSetInteger(0, n, OBJPROP_FONTSIZE,   fs);
   ObjectSetInteger(0, n, OBJPROP_COLOR,      clr);
   ObjectSetInteger(0, n, OBJPROP_CORNER,     CORNER_LEFT_UPPER);
   ObjectSetInteger(0, n, OBJPROP_XDISTANCE,  x);
   ObjectSetInteger(0, n, OBJPROP_YDISTANCE,  y);
   ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, n, OBJPROP_BACK,       false);
}

void Btn(string n, string txt, int x, int y, int w, int h, color bg, color fg)
{
   if(ObjectFind(0, n) < 0) ObjectCreate(0, n, OBJ_BUTTON, 0, 0, 0);
   ObjectSetString(0, n,  OBJPROP_TEXT,       txt);
   ObjectSetString(0, n,  OBJPROP_FONT,       FONT_N);
   ObjectSetInteger(0, n, OBJPROP_FONTSIZE,   FSZ_N);
   ObjectSetInteger(0, n, OBJPROP_COLOR,      fg);
   ObjectSetInteger(0, n, OBJPROP_BGCOLOR,    bg);
   ObjectSetInteger(0, n, OBJPROP_CORNER,     CORNER_LEFT_UPPER);
   ObjectSetInteger(0, n, OBJPROP_XDISTANCE,  x);
   ObjectSetInteger(0, n, OBJPROP_YDISTANCE,  y);
   ObjectSetInteger(0, n, OBJPROP_XSIZE,       w);
   ObjectSetInteger(0, n, OBJPROP_YSIZE,       h);
   ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, n, OBJPROP_STATE,      false);
}

// Create a dual-column key/value row (key left, value right)
void Row(string id, string key, string val, int y, color kc, color vc)
{
   Lbl(UI_PFX + "K" + id, key, PNL_X + 8,   y, kc, FSZ_N);
   Lbl(UI_PFX + "V" + id, val, PNL_X + 162,  y, vc, FSZ_N);
}

// Update value text + color of an existing row (does NOT change Y)
void RowSet(string id, string val, color vc)
{
   ObjectSetString(0,  UI_PFX + "V" + id, OBJPROP_TEXT,  val);
   ObjectSetInteger(0, UI_PFX + "V" + id, OBJPROP_COLOR, vc);
}

//═══════════════════════════════════════════════════════════════════
// CreatePanel — builds all structural objects once on init
//═══════════════════════════════════════════════════════════════════
void CreatePanel()
{
   ObjectsDeleteAll(0, UI_PFX);
   int cy = 20;

   // ── TITLE BAR ──────────────────────────────────────────────────
   Rect(UI_PFX + "BG_T",  PNL_X, cy, PNL_W, 28, COL_TITLE_BG,  COL_TITLE_BDR,  2);
   Lbl(UI_PFX + "TTL1", "AURA TREND DANGER EVOLVED  v2.00", PNL_X + 10, cy + 5,  COL_TEXT_HI, FSZ_H);
   Lbl(UI_PFX + "TTL2", _Symbol + "  |  Magic:" + IntegerToString(InpMagicNumber), PNL_X + 10, cy + 16, COL_ACCENT, FSZ_S);
   cy += 28 + GAP;

   // ── BLOCK: EQUITY (5 rows) ─────────────────────────────────────
   {
      int bH = HDR_H + 5 * ROW_H + 8;
      Rect(UI_PFX + "BG_EQ",  PNL_X, cy,       PNL_W, bH,   COL_BG_ROW,    COL_BORDER,   1);
      Rect(UI_PFX + "BH_EQ",  PNL_X, cy,       PNL_W, HDR_H, COL_BG_HEADER, COL_BG_HEADER, 0);
      Lbl(UI_PFX + "BHT_EQ", "[ EQUITY & PERFORMANCE ]", PNL_X + 8, cy + 4, COL_TEXT_HI, FSZ_H);
      g_yEqContent = cy + HDR_H + 4;
      Row("EQ1", "Equity",    "", g_yEqContent + 0 * ROW_H, COL_TEXT, COL_GOLD);
      Row("EQ2", "Balance",   "", g_yEqContent + 1 * ROW_H, COL_TEXT, COL_TEXT_HI);
      Row("EQ3", "Daily P/L", "", g_yEqContent + 2 * ROW_H, COL_TEXT, COL_BULL);
      Row("EQ4", "Drawdown",  "", g_yEqContent + 3 * ROW_H, COL_TEXT, COL_DIM);
      Row("EQ5", "Free Margin","",g_yEqContent + 4 * ROW_H, COL_TEXT, COL_TEXT);
      cy += bH + GAP;
   }

   // ── BLOCK: POSITIONS (5 rows) ──────────────────────────────────
   {
      int bH = HDR_H + 5 * ROW_H + 8;
      Rect(UI_PFX + "BG_PS",  PNL_X, cy,       PNL_W, bH,   COL_BG_ROW,    COL_BORDER,   1);
      Rect(UI_PFX + "BH_PS",  PNL_X, cy,       PNL_W, HDR_H, COL_BG_HEADER, COL_BG_HEADER, 0);
      Lbl(UI_PFX + "BHT_PS", "[ POSITIONS ]", PNL_X + 8, cy + 4, COL_TEXT_HI, FSZ_H);
      g_yPosContent = cy + HDR_H + 4;
      Row("PS1", "Total Pos",  "", g_yPosContent + 0 * ROW_H, COL_TEXT, COL_TEXT_HI);
      Row("PS2", "Total Lots", "", g_yPosContent + 1 * ROW_H, COL_TEXT, COL_TEXT_HI);
      Row("PS3", "Float P/L",  "", g_yPosContent + 2 * ROW_H, COL_TEXT, COL_BULL);
      Row("PS4", "Grid Level", "", g_yPosContent + 3 * ROW_H, COL_TEXT, COL_ACCENT);
      Row("PS5", "EA Status",  "", g_yPosContent + 4 * ROW_H, COL_TEXT, COL_BULL);
      cy += bH + GAP;
   }

   // ── BLOCK: EXIT PLAN (3 rows) ──────────────────────────────────
   {
      int bH = HDR_H + 3 * ROW_H + 8;
      Rect(UI_PFX + "BG_XP",  PNL_X, cy,       PNL_W, bH,   COL_BG_ROW,    COL_BORDER,   1);
      Rect(UI_PFX + "BH_XP",  PNL_X, cy,       PNL_W, HDR_H, COL_BG_HEADER, COL_BG_HEADER, 0);
      Lbl(UI_PFX + "BHT_XP", "[ EXIT PLAN ]", PNL_X + 8, cy + 4, COL_TEXT_HI, FSZ_H);
      g_yExitContent = cy + HDR_H + 4;
      Row("XP1", "Profit Target", "", g_yExitContent + 0 * ROW_H, COL_TEXT, COL_BULL);
      Row("XP2", "Loss Limit",    "", g_yExitContent + 1 * ROW_H, COL_TEXT, COL_BEAR);
      Row("XP3", "Remaining",     "", g_yExitContent + 2 * ROW_H, COL_TEXT, COL_ACCENT);
      cy += bH + GAP;
   }

   // ── BLOCK: MARKET (4 rows) ─────────────────────────────────────
   {
      int bH = HDR_H + 4 * ROW_H + 8;
      Rect(UI_PFX + "BG_MK",  PNL_X, cy,       PNL_W, bH,   COL_BG_ROW,    COL_BORDER,   1);
      Rect(UI_PFX + "BH_MK",  PNL_X, cy,       PNL_W, HDR_H, COL_BG_HEADER, COL_BG_HEADER, 0);
      Lbl(UI_PFX + "BHT_MK", "[ MARKET CONDITIONS ]", PNL_X + 8, cy + 4, COL_TEXT_HI, FSZ_H);
      g_yMktContent = cy + HDR_H + 4;
      Row("MK1", "Bid / Ask",    "", g_yMktContent + 0 * ROW_H, COL_TEXT, COL_TEXT_HI);
      Row("MK2", "Spread",       "", g_yMktContent + 1 * ROW_H, COL_TEXT, COL_BULL);
      Row("MK3", "ATR (pips)",   "", g_yMktContent + 2 * ROW_H, COL_TEXT, COL_ACCENT2);
      Row("MK4", InpUseDynamicStep ? "ATR Step (Dyn)" : "Step (Static)",
                 "", g_yMktContent + 3 * ROW_H, COL_TEXT, COL_ACCENT);
      cy += bH + GAP;
   }

   // ── BLOCK: ACTIONS ─────────────────────────────────────────────
   {
      int innerH = BTN_H + 4 + BTN_H + 4 + BTN_H + 6;
      int bH     = HDR_H + 6 + innerH;
      Rect(UI_PFX + "BG_AC",  PNL_X, cy,       PNL_W, bH,   COL_BG_ROW,    COL_BORDER,   1);
      Rect(UI_PFX + "BH_AC",  PNL_X, cy,       PNL_W, HDR_H, COL_BG_HEADER, COL_BG_HEADER, 0);
      Lbl(UI_PFX + "BHT_AC", "[ ACTIONS ]", PNL_X + 8, cy + 4, COL_TEXT_HI, FSZ_H);

      g_yActBtns = cy + HDR_H + 6;

      // Row 1 — 3 side-by-side control buttons
      int w1 = 96, w2 = 96, w3 = PNL_W - 8 - w1 - 4 - w2 - 4;
      Btn(UI_PFX + "BTN_PAUSE",      "  PAUSE",       PNL_X + 4,                  g_yActBtns, w1, BTN_H, COL_DIM,      COL_TEXT_HI);
      Btn(UI_PFX + "BTN_CLOSE_BUY",  "CLOSE BUY",    PNL_X + 4 + w1 + 4,          g_yActBtns, w2, BTN_H, C'15,65,40',  COL_BULL);
      Btn(UI_PFX + "BTN_CLOSE_SELL", "CLOSE SELL",   PNL_X + 4 + w1 + 4 + w2 + 4, g_yActBtns, w3, BTN_H, C'65,18,18',  COL_BEAR);

      // Row 2 — AUTO PARTIAL TOGGLE (full width)
      int r2y = g_yActBtns + BTN_H + 4;
      Btn(UI_PFX + "BTN_AP_TOGGLE",
          "  AUTO PARTIAL: ON",
          PNL_X + 4, r2y, PNL_W - 8, BTN_H, COL_ACCENT, COL_BG_DEEP);

      // Row 3 — MANUAL PARTIAL (full width, amber-tinted)
      int r3y = r2y + BTN_H + 4;
      Btn(UI_PFX + "BTN_AP_MANUAL",
          "  MANUALLY PARTIAL CLOSE NOW",
          PNL_X + 4, r3y, PNL_W - 8, BTN_H, COL_MANUAL_BG, COL_WARN);

      cy += bH + GAP;
   }

   // ── BLOCK: EVENT LOG (5 rows) ──────────────────────────────────
   {
      int bH = HDR_H + 5 * ROW_H + 8;
      Rect(UI_PFX + "BG_LG",  PNL_X, cy,       PNL_W, bH,   COL_BG_ROW,    COL_BORDER,   1);
      Rect(UI_PFX + "BH_LG",  PNL_X, cy,       PNL_W, HDR_H, COL_BG_HEADER, COL_BG_HEADER, 0);
      Lbl(UI_PFX + "BHT_LG", "[ EVENT LOG ]", PNL_X + 8, cy + 4, COL_TEXT_HI, FSZ_H);
      g_yLogContent = cy + HDR_H + 4;
      for(int i = 0; i < 5; i++)
         Lbl(UI_PFX + "LOG" + IntegerToString(i), "",
             PNL_X + 8, g_yLogContent + i * ROW_H,
             i == 0 ? COL_ACCENT : COL_DIM, FSZ_S);
   }

   ChartRedraw(0);
}

//═══════════════════════════════════════════════════════════════════
// UpdatePanel — called every tick to refresh live data
//═══════════════════════════════════════════════════════════════════
void UpdatePanel()
{
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double freeMgn = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   double dailyPL = equity - g_startDayEquity;
   double dd      = (g_peakEquity > 0) ? MathMax(0.0, (g_peakEquity - equity) / g_peakEquity * 100.0) : 0;

   int    bc      = CountPos(POSITION_TYPE_BUY);
   int    sc      = CountPos(POSITION_TYPE_SELL);
   double lots    = GetTotalLots();
   double fpnl    = GetTotalProfit();

   double bid     = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask     = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double spread  = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   double atrPips = GetCurrentATR() / g_pipSize;
   double stepPips= GetATRStep()    / g_pipSize;

   // EQUITY
   RowSet("EQ1", StringFormat("$ %.2f",   equity),  COL_GOLD);
   RowSet("EQ2", StringFormat("$ %.2f",   balance), COL_TEXT_HI);
   RowSet("EQ3", StringFormat("%+.2f $",  dailyPL), dailyPL >= 0 ? COL_BULL : COL_BEAR);
   RowSet("EQ4", StringFormat("%.2f %%",  dd),      dd > 5 ? COL_BEAR : dd > 2 ? COL_WARN : COL_BULL);
   RowSet("EQ5", StringFormat("$ %.2f",   freeMgn), COL_TEXT);

   // POSITIONS
   RowSet("PS1", StringFormat("%d  ( B:%d  S:%d )", bc + sc, bc, sc), COL_TEXT_HI);
   RowSet("PS2", StringFormat("%.2f lots", lots),                      COL_TEXT_HI);
   RowSet("PS3", StringFormat("%+.2f $",   fpnl),  fpnl >= 0 ? COL_BULL : COL_BEAR);
   RowSet("PS4", StringFormat("Buy:%-2d  Sell:%-2d  [max %d]", bc, sc, InpMaxGridLevels), COL_ACCENT);
   RowSet("PS5", g_isPaused ? "PAUSED" : "RUNNING", g_isPaused ? COL_WARN : COL_BULL);

   // EXIT PLAN
   RowSet("XP1", StringFormat("$ %.2f", InpDailyProfitTarget),                          COL_BULL);
   RowSet("XP2", StringFormat("$ %.2f", InpDailyLossLimit),                              COL_BEAR);
   RowSet("XP3", StringFormat("%+.2f $", InpDailyProfitTarget - dailyPL),               COL_ACCENT);

   // MARKET
   RowSet("MK1", StringFormat("%.5f / %.5f", bid, ask),     COL_TEXT_HI);
   RowSet("MK2", StringFormat("%.0f pts",    spread),        spread > 20 ? COL_WARN : COL_BULL);
   RowSet("MK3", StringFormat("%.1f pip",    atrPips),       COL_ACCENT2);
   RowSet("MK4", StringFormat("%.1f pip",    stepPips),      COL_ACCENT);

   // ACTIONS — PAUSE button
   ObjectSetString(0,  UI_PFX + "BTN_PAUSE", OBJPROP_TEXT,    g_isPaused ? "RESUME" : "PAUSE");
   ObjectSetInteger(0, UI_PFX + "BTN_PAUSE", OBJPROP_BGCOLOR, g_isPaused ? COL_PAUSE_BG : COL_DIM);
   ObjectSetInteger(0, UI_PFX + "BTN_PAUSE", OBJPROP_COLOR,   g_isPaused ? COL_WARN : COL_TEXT_HI);

   // ACTIONS — AUTO PARTIAL toggle
   if(g_autoPartialActive)
   {
      ObjectSetString(0,  UI_PFX + "BTN_AP_TOGGLE", OBJPROP_TEXT,    "  AUTO PARTIAL: ON");
      ObjectSetInteger(0, UI_PFX + "BTN_AP_TOGGLE", OBJPROP_BGCOLOR, COL_ACCENT);
      ObjectSetInteger(0, UI_PFX + "BTN_AP_TOGGLE", OBJPROP_COLOR,   COL_BG_DEEP);
   }
   else
   {
      ObjectSetString(0,  UI_PFX + "BTN_AP_TOGGLE", OBJPROP_TEXT,    "  AUTO PARTIAL: OFF");
      ObjectSetInteger(0, UI_PFX + "BTN_AP_TOGGLE", OBJPROP_BGCOLOR, COL_DIM);
      ObjectSetInteger(0, UI_PFX + "BTN_AP_TOGGLE", OBJPROP_COLOR,   COL_TEXT_HI);
   }

   // EVENT LOG
   for(int i = 0; i < 5; i++)
   {
      string n = UI_PFX + "LOG" + IntegerToString(i);
      ObjectSetString(0, n, OBJPROP_TEXT,  g_log[i]);
      ObjectSetInteger(0, n, OBJPROP_COLOR, i == 0 ? COL_ACCENT : COL_DIM);
   }

   ChartRedraw(0);
}
//+------------------------------------------------------------------+
