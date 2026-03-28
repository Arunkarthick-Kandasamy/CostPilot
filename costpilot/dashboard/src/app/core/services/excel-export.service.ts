import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExcelExportService {

  async exportDashboardReport(data: {
    totalSavingsIdentified: number;
    totalSavingsRealized: number;
    pendingProposals: number;
    executedProposals: number;
    savingsByAgent: { agentType: string; totalSavings: number; count: number }[];
    topFindings: { title: string; agentType: string; estimatedSavings: number; riskLevel: string; status: string }[];
  }) {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'CostPilot';
    wb.created = new Date();

    // --- Colors ---
    const brandPurple = '6366F1';
    const brandDark = '4F46E5';
    const green = '10B981';
    const greenBg = 'ECFDF5';
    const amber = 'F59E0B';
    const amberBg = 'FFFBEB';
    const red = 'EF4444';
    const redBg = 'FEF2F2';
    const blue = '3B82F6';
    const blueBg = 'EFF6FF';
    const darkText = '111827';
    const mutedText = '6B7280';
    const headerBg = 'F8F9FC';
    const borderColor = 'E5E7EB';

    // ============== SHEET 1: Executive Summary ==============
    const ws1 = wb.addWorksheet('Executive Summary', {
      properties: { tabColor: { argb: brandPurple } },
      views: [{ showGridLines: false }],
    });

    ws1.columns = [
      { width: 3 }, { width: 28 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 5 },
    ];

    // Title banner
    ws1.mergeCells('B2:E2');
    const titleCell = ws1.getCell('B2');
    titleCell.value = 'COSTPILOT — EXECUTIVE REPORT';
    titleCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandPurple } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws1.getRow(2).height = 48;
    ['C2', 'D2', 'E2'].forEach(c => {
      ws1.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandPurple } };
    });

    // Subtitle
    ws1.mergeCells('B3:E3');
    const subCell = ws1.getCell('B3');
    subCell.value = `Enterprise Cost Intelligence Report — Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    subCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FFFFFF' }, italic: true };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDark } };
    subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws1.getRow(3).height = 28;
    ['C3', 'D3', 'E3'].forEach(c => {
      ws1.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDark } };
    });

    // KPI Section
    ws1.getRow(5).height = 20;
    ws1.mergeCells('B5:E5');
    const sectionCell = ws1.getCell('B5');
    sectionCell.value = 'KEY METRICS';
    sectionCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: mutedText } };
    sectionCell.alignment = { indent: 1 };

    const kpis = [
      { label: 'Total Savings Identified', value: data.totalSavingsIdentified, color: green, bg: greenBg, format: '$#,##0' },
      { label: 'Total Savings Realized', value: data.totalSavingsRealized, color: blue, bg: blueBg, format: '$#,##0.00' },
      { label: 'Pending Approvals', value: data.pendingProposals, color: amber, bg: amberBg, format: '#,##0' },
      { label: 'Executed Actions', value: data.executedProposals, color: brandPurple, bg: 'F5F3FF', format: '#,##0' },
    ];

    kpis.forEach((kpi, i) => {
      const row = 6 + i;
      ws1.getRow(row).height = 36;

      const labelCell = ws1.getCell(`B${row}`);
      labelCell.value = kpi.label;
      labelCell.font = { name: 'Segoe UI', size: 11, color: { argb: darkText } };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bg } };
      labelCell.alignment = { vertical: 'middle', indent: 1 };
      labelCell.border = {
        top: { style: 'thin', color: { argb: borderColor } },
        bottom: { style: 'thin', color: { argb: borderColor } },
        left: { style: 'medium', color: { argb: kpi.color } },
      };

      const valCell = ws1.getCell(`C${row}`);
      valCell.value = kpi.value;
      valCell.numFmt = kpi.format;
      valCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: kpi.color } };
      valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bg } };
      valCell.alignment = { vertical: 'middle', horizontal: 'right' };
      valCell.border = {
        top: { style: 'thin', color: { argb: borderColor } },
        bottom: { style: 'thin', color: { argb: borderColor } },
      };

      ['D', 'E'].forEach(col => {
        const cell = ws1.getCell(`${col}${row}`);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bg } };
        cell.border = {
          top: { style: 'thin', color: { argb: borderColor } },
          bottom: { style: 'thin', color: { argb: borderColor } },
        };
      });
    });

    // Agent Performance Section
    const agentStart = 12;
    ws1.mergeCells(`B${agentStart}:E${agentStart}`);
    const agentHeader = ws1.getCell(`B${agentStart}`);
    agentHeader.value = 'SAVINGS BY AGENT';
    agentHeader.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: mutedText } };
    agentHeader.alignment = { indent: 1 };

    // Agent table header
    const agentColors: Record<string, string> = { Spend: green, Sla: red, Resource: blue, Finops: amber };
    const athRow = agentStart + 1;
    ws1.getRow(athRow).height = 30;
    const athCells = [
      { col: 'B', val: 'Agent' },
      { col: 'C', val: 'Total Savings' },
      { col: 'D', val: 'Proposals' },
      { col: 'E', val: '% of Total' },
    ];
    athCells.forEach(({ col, val }) => {
      const cell = ws1.getCell(`${col}${athRow}`);
      cell.value = val;
      cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandPurple } };
      cell.alignment = { vertical: 'middle', horizontal: col === 'B' ? 'left' : 'center', indent: col === 'B' ? 1 : 0 };
      cell.border = { bottom: { style: 'thin', color: { argb: brandDark } } };
    });

    const totalAllSavings = data.savingsByAgent.reduce((s, a) => s + a.totalSavings, 0) || 1;

    data.savingsByAgent.forEach((agent, i) => {
      const row = athRow + 1 + i;
      ws1.getRow(row).height = 28;
      const isEven = i % 2 === 0;
      const rowBg = isEven ? 'FFFFFF' : headerBg;
      const ac = agentColors[agent.agentType] || mutedText;

      const nameCell = ws1.getCell(`B${row}`);
      nameCell.value = agent.agentType;
      nameCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: ac } };
      nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      nameCell.alignment = { vertical: 'middle', indent: 1 };
      nameCell.border = { bottom: { style: 'thin', color: { argb: borderColor } }, left: { style: 'medium', color: { argb: ac } } };

      const savCell = ws1.getCell(`C${row}`);
      savCell.value = agent.totalSavings;
      savCell.numFmt = '$#,##0';
      savCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: darkText } };
      savCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      savCell.alignment = { vertical: 'middle', horizontal: 'center' };
      savCell.border = { bottom: { style: 'thin', color: { argb: borderColor } } };

      const cntCell = ws1.getCell(`D${row}`);
      cntCell.value = agent.count;
      cntCell.font = { name: 'Segoe UI', size: 11, color: { argb: darkText } };
      cntCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cntCell.alignment = { vertical: 'middle', horizontal: 'center' };
      cntCell.border = { bottom: { style: 'thin', color: { argb: borderColor } } };

      const pctCell = ws1.getCell(`E${row}`);
      pctCell.value = agent.totalSavings / totalAllSavings;
      pctCell.numFmt = '0.0%';
      pctCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: ac } };
      pctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      pctCell.alignment = { vertical: 'middle', horizontal: 'center' };
      pctCell.border = { bottom: { style: 'thin', color: { argb: borderColor } } };
    });

    // ============== SHEET 2: Top Findings ==============
    const ws2 = wb.addWorksheet('Top Findings', {
      properties: { tabColor: { argb: green } },
      views: [{ showGridLines: false }],
    });

    ws2.columns = [
      { width: 3 }, { width: 6 }, { width: 45 }, { width: 16 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 3 },
    ];

    // Title
    ws2.mergeCells('B2:G2');
    const t2 = ws2.getCell('B2');
    t2.value = 'TOP FINDINGS BY IMPACT';
    t2.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandPurple } };
    t2.alignment = { vertical: 'middle', indent: 1 };
    ws2.getRow(2).height = 42;
    ['C2','D2','E2','F2','G2'].forEach(c => {
      ws2.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandPurple } };
    });

    // Table header
    const fhRow = 4;
    ws2.getRow(fhRow).height = 28;
    const fhCells = [
      { col: 'B', val: '#', w: 'center' },
      { col: 'C', val: 'Finding', w: 'left' },
      { col: 'D', val: 'Agent', w: 'center' },
      { col: 'E', val: 'Est. Savings', w: 'center' },
      { col: 'F', val: 'Risk', w: 'center' },
      { col: 'G', val: 'Status', w: 'center' },
    ];
    fhCells.forEach(({ col, val, w }) => {
      const cell = ws2.getCell(`${col}${fhRow}`);
      cell.value = val;
      cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: mutedText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
      cell.alignment = { vertical: 'middle', horizontal: w as any, indent: col === 'C' ? 1 : 0 };
      cell.border = { bottom: { style: 'medium', color: { argb: borderColor } } };
    });

    const riskColors: Record<string, { fg: string; bg: string }> = {
      Low: { fg: green, bg: greenBg },
      Medium: { fg: amber, bg: amberBg },
      High: { fg: 'EA580C', bg: 'FFF7ED' },
      Critical: { fg: red, bg: redBg },
    };
    const statusColors: Record<string, { fg: string; bg: string }> = {
      Pending: { fg: amber, bg: amberBg },
      Approved: { fg: green, bg: greenBg },
      Executed: { fg: blue, bg: blueBg },
      Rejected: { fg: red, bg: redBg },
    };

    data.topFindings.forEach((f, i) => {
      const row = fhRow + 1 + i;
      ws2.getRow(row).height = 32;
      const isEven = i % 2 === 0;
      const rowBg = isEven ? 'FFFFFF' : 'FAFBFD';
      const ac = agentColors[f.agentType] || mutedText;
      const rc = riskColors[f.riskLevel] || { fg: mutedText, bg: 'F9FAFB' };
      const sc = statusColors[f.status] || { fg: mutedText, bg: 'F9FAFB' };

      // Rank
      const rankCell = ws2.getCell(`B${row}`);
      rankCell.value = i + 1;
      rankCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: mutedText } };
      rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      rankCell.alignment = { vertical: 'middle', horizontal: 'center' };
      rankCell.border = { bottom: { style: 'thin', color: { argb: borderColor } } };

      // Title
      const titleCell = ws2.getCell(`C${row}`);
      titleCell.value = f.title;
      titleCell.font = { name: 'Segoe UI', size: 10, color: { argb: darkText } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      titleCell.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
      titleCell.border = { bottom: { style: 'thin', color: { argb: borderColor } } };

      // Agent
      const agentCell = ws2.getCell(`D${row}`);
      agentCell.value = f.agentType;
      agentCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: ac } };
      agentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      agentCell.alignment = { vertical: 'middle', horizontal: 'center' };
      agentCell.border = { bottom: { style: 'thin', color: { argb: borderColor } } };

      // Savings
      const savCell = ws2.getCell(`E${row}`);
      savCell.value = f.estimatedSavings;
      savCell.numFmt = '$#,##0';
      savCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: green } };
      savCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      savCell.alignment = { vertical: 'middle', horizontal: 'center' };
      savCell.border = { bottom: { style: 'thin', color: { argb: borderColor } } };

      // Risk
      const riskCell = ws2.getCell(`F${row}`);
      riskCell.value = f.riskLevel;
      riskCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: rc.fg } };
      riskCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rc.bg } };
      riskCell.alignment = { vertical: 'middle', horizontal: 'center' };
      riskCell.border = { bottom: { style: 'thin', color: { argb: borderColor } } };

      // Status
      const statusCell = ws2.getCell(`G${row}`);
      statusCell.value = f.status;
      statusCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: sc.fg } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sc.bg } };
      statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
      statusCell.border = { bottom: { style: 'thin', color: { argb: borderColor } } };
    });

    // Footer
    const footRow = fhRow + 1 + data.topFindings.length + 1;
    ws2.mergeCells(`B${footRow}:G${footRow}`);
    const footCell = ws2.getCell(`B${footRow}`);
    footCell.value = `Generated by CostPilot • ${new Date().toLocaleString()}`;
    footCell.font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: mutedText } };
    footCell.alignment = { horizontal: 'right' };

    // ============== Download ==============
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CostPilot-Report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async exportProposals(proposals: { title: string; agentType: string; estimatedSavings: number; riskLevel: string; status: string }[]) {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Proposals', { views: [{ showGridLines: false }] });

    const brandPurple = '6366F1';
    const green = '10B981';
    const mutedText = '6B7280';
    const darkText = '111827';
    const borderColor = 'E5E7EB';
    const headerBg = 'F8F9FC';

    ws.columns = [
      { width: 3 }, { width: 6 }, { width: 50 }, { width: 16 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 3 },
    ];

    // Title
    ws.mergeCells('B2:G2');
    const t = ws.getCell('B2');
    t.value = 'ACTION PROPOSALS';
    t.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandPurple } };
    t.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(2).height = 42;
    ['C2','D2','E2','F2','G2'].forEach(c => {
      ws.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandPurple } };
    });

    // Headers
    const headers = ['#', 'Proposal', 'Agent', 'Est. Savings', 'Risk', 'Status'];
    const cols = ['B','C','D','E','F','G'];
    ws.getRow(4).height = 28;
    headers.forEach((h, i) => {
      const cell = ws.getCell(`${cols[i]}4`);
      cell.value = h;
      cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: mutedText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
      cell.alignment = { vertical: 'middle', horizontal: i <= 1 ? 'center' : (i === 1 ? 'left' : 'center') };
      cell.border = { bottom: { style: 'medium', color: { argb: borderColor } } };
    });

    const agentColors: Record<string, string> = { Spend: '10B981', Sla: 'EF4444', Resource: '3B82F6', Finops: 'F59E0B' };
    const riskColors: Record<string, { fg: string; bg: string }> = {
      Low: { fg: '10B981', bg: 'ECFDF5' }, Medium: { fg: 'F59E0B', bg: 'FFFBEB' },
      High: { fg: 'EA580C', bg: 'FFF7ED' }, Critical: { fg: 'EF4444', bg: 'FEF2F2' },
    };
    const statusColors: Record<string, { fg: string; bg: string }> = {
      Pending: { fg: 'F59E0B', bg: 'FFFBEB' }, Approved: { fg: '10B981', bg: 'ECFDF5' },
      Executed: { fg: '3B82F6', bg: 'EFF6FF' }, Rejected: { fg: 'EF4444', bg: 'FEF2F2' },
    };

    proposals.forEach((p, i) => {
      const row = 5 + i;
      ws.getRow(row).height = 30;
      const bg = i % 2 === 0 ? 'FFFFFF' : 'FAFBFD';
      const rc = riskColors[p.riskLevel] || { fg: mutedText, bg: 'F9FAFB' };
      const sc = statusColors[p.status] || { fg: mutedText, bg: 'F9FAFB' };

      const setCell = (col: string, value: any, opts: any = {}) => {
        const cell = ws.getCell(`${col}${row}`);
        cell.value = value;
        cell.font = { name: 'Segoe UI', size: 10, ...opts.font };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg || bg } };
        cell.alignment = { vertical: 'middle', horizontal: opts.align || 'center', ...opts.alignment };
        cell.border = { bottom: { style: 'thin', color: { argb: borderColor } } };
        if (opts.numFmt) cell.numFmt = opts.numFmt;
      };

      setCell('B', i + 1, { font: { bold: true, color: { argb: mutedText } } });
      setCell('C', p.title, { align: 'left', alignment: { wrapText: true, indent: 1 }, font: { color: { argb: darkText } } });
      setCell('D', p.agentType, { font: { bold: true, color: { argb: agentColors[p.agentType] || mutedText } } });
      setCell('E', p.estimatedSavings, { numFmt: '$#,##0', font: { bold: true, color: { argb: green }, size: 11 } });
      setCell('F', p.riskLevel, { bg: rc.bg, font: { bold: true, color: { argb: rc.fg }, size: 9 } });
      setCell('G', p.status, { bg: sc.bg, font: { bold: true, color: { argb: sc.fg }, size: 9 } });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CostPilot-Proposals-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
