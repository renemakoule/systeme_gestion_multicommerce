import { API_URL } from "@/lib/config";
import React, { useState, useEffect } from "react";
import { FileText, FileSpreadsheet, Download, Calendar, BarChart, TrendingUp, Wallet, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";

export function ReportsModule() {
  const { user } = useDashboard();
  const companyId = user?.company_id || 1;
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const fetchData = async () => {
    try {
      // Fetch Summary
      const sumRes = await fetch(`${API_URL}/reports/summary?company_id=${companyId}&month=${selectedMonth}&year=${selectedYear}`);
      const sumData = await sumRes.json();
      setSummary(sumData);

      // Fetch History
      const histRes = await fetch(`${API_URL}/reports/history?company_id=${companyId}`);
      const histData = await histRes.json();
      setHistory(Array.isArray(histData) ? histData : []);
    } catch (err) {
      console.error("Failed to fetch report data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const handleExport = async (type: 'pdf' | 'excel') => {
    setIsGenerating(true);
    try {
      const url = `${API_URL}/reports/${type}?company_id=${companyId}&month=${selectedMonth}&year=${selectedYear}`;
      window.open(url, '_blank');
      
      // Refresh history after generation
      setTimeout(fetchData, 3000);
      setTimeout(() => setIsGenerating(false), 2000);
    } catch (err) {
      console.error("Export failed", err);
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full space-y-8 animate-in fade-in duration-500 overflow-y-auto pr-2 custom-scrollbar pb-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-black uppercase tracking-[0.3em]">Centre de Rapports</h2>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Générez et exportez vos bilans d'activité</p>
      </div>

      {/* SELECTION CARD */}
      <div className="p-8 rounded-[3px] border border-border/10 bg-background/40 flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="flex flex-col gap-4 w-full md:w-auto">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Période du Rapport</h4>
            <div className="flex gap-2">
               <select 
                 value={selectedMonth}
                 onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                 className="bg-background border border-border/20 p-2 text-[10px] uppercase font-bold outline-none rounded-[3px] min-w-[140px]"
               >
                  {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
               </select>
               <select 
                 value={selectedYear}
                 onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                 className="bg-background border border-border/20 p-2 text-[10px] uppercase font-bold outline-none rounded-[3px]"
               >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
               </select>
            </div>
         </div>

         <div className="flex gap-3 w-full md:w-auto">
            <Button 
              onClick={() => handleExport('excel')}
              disabled={isGenerating}
              variant="outline" 
              className="flex-1 md:flex-none h-12 px-6 rounded-[3px] border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest gap-3"
            >
               <FileSpreadsheet size={16} /> Excel (.xlsx)
            </Button>
            <Button 
              onClick={() => handleExport('pdf')}
              disabled={isGenerating}
              className="flex-1 md:flex-none h-12 px-6 rounded-[3px] bg-foreground text-background hover:bg-foreground/90 text-[10px] font-black uppercase tracking-widest gap-3"
            >
               <FileText size={16} /> PDF (.pdf)
            </Button>
         </div>
      </div>

      {/* REPORT TYPES GRID - REAL DATA INDICATORS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { 
             title: "Bilan des Ventes", 
             val: summary?.total_sales !== undefined ? `${summary.total_sales.toLocaleString()} CFA` : "---",
             desc: `${summary?.sales_count || 0} transactions enregistrées.`, 
             icon: TrendingUp, 
             status: "Prêt" 
           },
           { 
             title: "Synthèse des Coûts", 
             val: summary?.total_expenses !== undefined ? `${summary.total_expenses.toLocaleString()} CFA` : "---",
             desc: "Dépenses opérationnelles et factures.", 
             icon: Wallet, 
             status: "Prêt" 
           },
           { 
             title: "Résultat Net", 
             val: summary?.net_profit !== undefined ? `${summary.net_profit.toLocaleString()} CFA` : "---",
             desc: "Bénéfice calculé (Ventes - Dépenses).", 
             icon: BarChart, 
             status: (summary?.net_profit || 0) >= 0 ? "Prêt" : "Déficit",
             statusColor: (summary?.net_profit || 0) >= 0 ? "emerald" : "orange"
           },
         ].map((report: any) => (
           <div key={report.title} className="p-6 rounded-[3px] border border-border/10 bg-background/20 space-y-4 hover:border-[var(--primary-accent)]/20 transition-all group relative">
              <div className="flex justify-between items-start">
                 <div className="p-3 rounded-[3px] bg-muted/20 text-muted-foreground group-hover:text-[var(--primary-accent)] group-hover:bg-[var(--primary-accent-pale)] transition-all">
                    <report.icon size={18} />
                 </div>
                 <span className={cn(
                    "text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                    (report.statusColor === "emerald" || report.status === "Prêt") ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                 )}>{report.status}</span>
              </div>
              <div className="space-y-1">
                 <h5 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">{report.title}</h5>
                 <p className="text-lg font-black tracking-tight">{report.val}</p>
                 <p className="text-[9px] text-muted-foreground/60 leading-relaxed font-bold">{report.desc}</p>
              </div>
           </div>
         ))}
      </div>

      {/* RECENT DOWNLOADS - DYNAMIC HISTORY */}
      <div className="space-y-4 pt-4">
         <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Générés Récemment</h4>
         <div className="space-y-2">
            {history.length > 0 ? history.map((report) => (
               <div key={report.id} className="flex items-center justify-between p-4 rounded-[3px] border border-border/5 bg-background/10 hover:bg-muted/5 transition-all">
                  <div className="flex items-center gap-4">
                     <div className="w-8 h-8 rounded-[3px] bg-muted/20 flex items-center justify-center text-muted-foreground">
                        {report.type === "PDF" ? <FileText size={14} /> : <FileSpreadsheet size={14} />}
                     </div>
                     <div>
                        <p className="text-[10px] font-bold">{report.filename}</p>
                        <p className="text-[8px] opacity-40 uppercase">Période: {report.period} • Généré le {new Date(report.timestamp).toLocaleDateString()} à {new Date(report.timestamp).toLocaleTimeString()}</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => {
                        // Re-download logic
                        const url = `${API_URL}/reports/${report.type.toLowerCase()}?company_id=${companyId}&month=${selectedMonth}&year=${selectedYear}`; // This is simplified, real re-download should use stored path if saved
                        window.open(url, '_blank');
                    }}
                    className="text-muted-foreground/40 hover:text-foreground p-2"
                  >
                     <Download size={14} />
                  </button>
               </div>
            )) : (
              <div className="p-10 border border-dashed border-border/20 rounded-[3px] text-center opacity-40">
                <p className="text-[10px] font-bold uppercase tracking-widest">Aucun rapport généré récemment</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
