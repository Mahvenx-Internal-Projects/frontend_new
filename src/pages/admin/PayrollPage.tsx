import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, Plus, Search, Pencil, Trash2, X,
  Phone, Mail, Download, Eye, User, Shield, Banknote,
  FileText, Printer, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

const DOMAINS  = ['All','DotNet','Java','Python','SAP','ServiceNow','React','Angular','FullStack','DevOps','QA','Other'];
const STATUSES = ['All','Active','Inactive','OnHold'];
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const EMPTY = {
  fullName:'', email:'', phone:'', address:'', designation:'', department:'', domain:'DotNet',
  joiningDate:'',
  ctc:'', grossSalary:'', basicSalary:'', hra:'', conveyanceAllowance:'', specialAllowance:'',
  pfRequired:'No', pfNumber:'', pfEmployee:'', pfEmployer:'',
  tds:'', professionTax:'', otherDeductions:'',
  totalDeductions:'', netSalary:'',
  gstApplicable:'No', gstAmount:'',
  payrollFromDate:'', payrollToDate:'', paymentDay:'1',
  bankName:'', accountNumber:'', ifscCode:'', accountHolderName:'', bankBranch:'',
  panCard:'', aadharCard:'', additionalDocuments:'',
  status:'Active', notes:''
};

// ─── Salary Calculator (matches offer letter structure) ─────────
function calcAll(form: any) {
  const ctcAnnual = parseFloat(form.ctc) || 0;
  const ctcMonthly = parseFloat(((ctcAnnual * 100000) / 12).toFixed(0));
  const gross   = ctcMonthly; // gross = CTC per month
  const basic   = parseFloat(form.basicSalary)         || parseFloat((gross * 0.5).toFixed(0));
  const hra     = parseFloat(form.hra)                 || parseFloat((basic * 0.6).toFixed(0));
  const convey  = parseFloat(form.conveyanceAllowance) || parseFloat((gross * 0.1).toFixed(0));
  const special = parseFloat(form.specialAllowance)    || parseFloat((gross * 0.1).toFixed(0));

  // PF: 12% of basic (employee) + 12% employer
  const pfEmp  = form.pfRequired === 'Yes' ? parseFloat((basic * 0.12).toFixed(0)) : 0;
  const pfEmpl = form.pfRequired === 'Yes' ? parseFloat((basic * 0.12).toFixed(0)) : 0;
  const tds    = parseFloat(form.tds)            || 200;
  const pt     = parseFloat(form.professionTax)  || 0;
  const others = parseFloat(form.otherDeductions)|| 0;
  const totalDed = pfEmp + tds + pt + others;
  const net    = gross - totalDed;

  // GST: 18% on gross monthly salary (if applicable)
  const gst = form.gstApplicable === 'Yes' ? parseFloat((gross * 0.18).toFixed(0)) : 0;

  return { gross, basic, hra, convey, special, pfEmp, pfEmpl, tds, pt, others, totalDed, net, gst };
}

function printHTML(html: string, filename: string) {
  const w = window.open('', '_blank');
  if (!w) { toast.error('Allow popups to download'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
}


// ═══════════════════════════════════════════════════════════════
// OFFER LETTER TAB
// ═══════════════════════════════════════════════════════════════
function numberToWords(n: number): string {
  if (!n || n === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n < 20)  return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '');
  if (n < 1000) return ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+numberToWords(n%100):'');
  if (n < 100000) return numberToWords(Math.floor(n/1000))+' Thousand'+(n%1000?' '+numberToWords(n%1000):'');
  if (n < 10000000) return numberToWords(Math.floor(n/100000))+' Lakh'+(n%100000?' '+numberToWords(n%100000):'');
  return numberToWords(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+numberToWords(n%10000000):'');
}

const EMPTY_OL = {
  fullName: '', address: '', designation: 'Software Associate',
  joiningDate: '', ctc: '', grossSalary: '', basicSalary: '',
  hra: '', conveyanceAllowance: '', specialAllowance: '',
  pfEmployee: '0', tds: '200', professionTax: '0',
  otherDeductions: '0', netSalary: '',
};

function OfferLetterTab({ employees }: { employees: any[] }) {
  const [mode,   setMode]   = useState<'select'|'edit'>('select');
  const [source, setSource] = useState<'existing'|'new'>('existing');
  const [selId,  setSelId]  = useState('');
  const [form,   setForm]   = useState<any>(EMPTY_OL);
  const [preview,setPreview]= useState(false);

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const loadEmployee = (id: string) => {
    const emp = employees.find((e: any) => String(e.id) === id);
    if (!emp) return;
    setForm({
      fullName: emp.fullName || '',
      address: emp.address || '',
      designation: emp.designation || 'Software Associate',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : (emp.payrollFromDate ? emp.payrollFromDate.split('T')[0] : ''),
      ctc: String(emp.ctc || ''),
      grossSalary: String(emp.grossSalary || ''),
      basicSalary: String(emp.basicSalary || ''),
      hra: String(emp.hra || ''),
      conveyanceAllowance: String(emp.conveyanceAllowance || ''),
      specialAllowance: String(emp.specialAllowance || ''),
      pfEmployee: String(emp.pfEmployee || '0'),
      tds: String(emp.tds || '200'),
      professionTax: String(emp.professionTax || '0'),
      otherDeductions: String(emp.otherDeductions || '0'),
      netSalary: String(emp.netSalary || ''),
    });
    setMode('edit');
  };

  const fmt  = (n: any) => n && Number(n) ? Number(n).toLocaleString('en-IN') : '00.00';
  const ctcAnnual = Number(form.ctc || 0) * 100000;
  const ctcWords  = numberToWords(Math.round(ctcAnnual));
  const joinStr   = form.joiningDate
    ? new Date(form.joiningDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})
    : '____________, ____________, ____________';
  const dateStr   = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'});
  const apprYear  = new Date().getFullYear() + 2;

  const addrLines = (form.address || '').split('\n').filter(Boolean);

  // ── Generate HTML matching exact Mahvenx PDF format ──────────
  const generateHTML = () => {
    const fmt2 = (n: any) => {
      const v = parseFloat(n);
      return isNaN(v) ? '00.00' : v.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
    };
    const addrHtml = (form.address || '')
      .split('\n').filter(Boolean)
      .map((l: string, i: number, arr: string[]) => l + (i < arr.length - 1 ? ',' : ''))
      .join('<br/>');
    const ctcAnnualNum = Number(form.ctc || 0) * 100000;
    const ctcAnnualFmt = ctcAnnualNum.toLocaleString('en-IN') + '.00';
    const joinFmt = form.joiningDate
      ? new Date(form.joiningDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})
      : '____________, ____________, ____________';
    const apprYear = new Date().getFullYear() + 2;
    const todayFmt = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'});

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>${form.fullName || 'Offer Letter'}</title>
<style>
@page{size:A4;margin:18mm 20mm 20mm 20mm;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:11pt;color:#000;line-height:1.5;}
.logo{font-size:22pt;font-weight:900;color:#1a237e;margin-bottom:6pt;}
.logo .red{color:#c62828;}
.logo-rule{border:none;border-top:2.5pt solid #1a237e;margin-bottom:14pt;}
.date-line{font-weight:bold;margin-bottom:10pt;}
.subject-block{margin-bottom:14pt;}
.subject-line{font-weight:bold;}
.address-block{margin-bottom:16pt;font-weight:bold;line-height:1.8;}
p{margin-bottom:9pt;text-align:justify;}
p.left{text-align:left;}
.sig-row{display:flex;justify-content:space-between;margin-top:28pt;}
.sig-line{border-bottom:1pt solid #000;width:180pt;margin-top:26pt;margin-bottom:3pt;}
.footer{border-top:0.5pt solid #888;padding-top:5pt;margin-top:16pt;font-size:8pt;color:#444;text-align:center;line-height:1.6;}
.footer-right{text-align:right;font-size:8pt;color:#444;line-height:1.6;margin-bottom:10pt;}
.page{page-break-before:always;}
.annex-title{text-align:center;font-weight:bold;font-size:11pt;margin:8pt 0 2pt;}
.annex-sub{text-align:center;text-decoration:underline;font-weight:bold;font-size:11pt;margin-bottom:10pt;}
h3{font-size:11pt;font-weight:bold;margin:9pt 0 3pt;}
ol,ul{margin-left:18pt;margin-bottom:8pt;}
li{margin-bottom:3pt;line-height:1.5;}
table{width:100%;border-collapse:collapse;margin:8pt 0;font-size:10pt;}
th{background:#1a237e;color:#fff;padding:5pt 7pt;text-align:left;border:0.5pt solid #888;}
th.r,td.r{text-align:right;}
td{padding:4pt 7pt;border:0.5pt solid #bbb;}
tr.e td{background:#f5f5f5;}
tr.lh td{background:#e0e0e0;font-weight:bold;padding:2pt 7pt;}
tr.net td{font-weight:bold;background:#e8f5e9;border-top:1.5pt solid #1a237e;}
tr.ctc td{font-weight:bold;}
.note{font-size:9pt;color:#333;margin:2pt 0;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>

<div class="logo">M<span class="red">ahvenx</span></div>
<hr class="logo-rule"/>

<p class="left date-line">${todayFmt}</p>
<div class="subject-block">
  <p class="left subject-line">Subject: Employment Offer with Mahvenx</p>
  <p class="left subject-line">${form.fullName || '________________________'}</p>
</div>

<div class="address-block">
  ${form.fullName || '________________________'}<br/>
  ${addrHtml || 'D/o ________________________,<br/>________________________,<br/>________________________.<br/>Pin code: ________________________'}
</div>

<p class="left"><strong>Dear</strong> <strong>${form.fullName || '________________________'}</strong>,</p>

<p>We are pleased to welcome you to the Mahvenx family with an offer of employment with us, as a <strong>${form.designation || 'Software Associate'}</strong>, with a start date of <strong>${joinFmt}</strong>.</p>

<p>We believe that exceptional talent can produce exceptional results, and we deem you to be one such, with your experience, expertise, attitude, and cultural fit with our team. We will provide you with the right platform for you to grow and accomplish your personal and professional goals. We expect you in turn to bring your intellect, your thought process, out-of-the-box thinking, passion, and ideas to make your career at Mahvenx a huge success.</p>

<p>Your annual compensation will be INR <strong>${ctcAnnualFmt}, (${ctcWords} Rupees Only.)</strong> Please refer to Annexure IV for the detailed compensation structure.</p>

<p><strong>Appraisal:</strong> Your first annual performance appraisal will be effective from September 01, ${apprYear}. For the first year, it will be planned for 12 months based on your joining date. After that, it will be conducted annually in line with company norms and contingent upon your performance.</p>

<p>Please review Annexures I, II and III that describe Mahvenx's policies, procedures, benefits, and other terms related to your employment. Please note that these policies and terms are subject to amendments and adjustments from time to time.</p>

<p>We sincerely look forward to having you join us. Pease do not hesitate to contact us should you have any questions.</p>

<p class="left">Thankyou.<br/>Sincerely,</p>

<div class="sig-row">
  <div><div class="sig-line"></div><strong>Divya Madicharla</strong><br/>HR</div>
  <div style="text-align:right;"><div class="sig-line" style="margin-left:auto;"></div><strong>Employee Signature &amp; Date of Acceptance</strong></div>
</div>

<div class="footer">
  Mahvenx It Solutions Pvt Ltd, 1st Floor, B Block, Kanaka Durga Mansion <br/>
  Plot No 52, 53, 5th Phase<br/>
  KPHB Colony, Hyderabad - 500 072<br/>
  Website: www.Mahvenx.com &nbsp;;&nbsp; Email: hr@Mahvenx.com
</div>

<!-- ANNEXURE I -->
<div class="page">
<div class="logo">M<span class="red">ahvenx</span></div><hr class="logo-rule"/>
<div class="annex-title">Annexure – I</div>
<div class="annex-sub">Mahvenx Terms and General Legal Terms</div>
<h3>Place of Work:</h3>
<p>Your place of work will be Mahvenx It Solutions Pvt Ltd, plot no 52,53, 1st B Block, Kanaka Durga Mansion, 5th Phase Kukatpally Colony Hyderabad, Telangana 500081, India.</p>
<h3>Timings:</h3>
<p>Your working hours will be from 9:30 AM to 6:30 PM IST, Monday through Saturday, except holidays. If there is any change in working hours, it will be intimated to you by your Reporting Authority.</p>
<h3>Probation &amp; Confirmation:</h3>
<p>You will be on probation for a period of Four (3) months. On completion of your probationary period and based on your performance outcome, the management may at its sole discretion confirm your services or extend the period of probation as deemed fit.</p>
<h3>Background Checks:</h3>
<p>Mahvenx, at its discretion will conduct background checks prior to or after your joining date, to validate your identity, address, education, work experience and criminal checks by a third party. You will explicitly declare consent to the company conducting such background checks. In this connection, you are required to furnish the documents listed in Annexure IV.</p>
<h3>POSH (Prevention of Sexual Harassment):</h3>
<p>Mahvenx does not tolerate any form of abuse, verbal, or physical behavior, which is unsolicited and unwelcome and interferes with an individual's work performance by creating intimidating / insecure working environment will come under this act. Such conduct constitutes an offence under the law. Mahvenx has constituted an "Internal Complaints Committee" for receiving and for time bound redressal of complaints.</p>
<h3>Non-disclosure Agreement:</h3>
<p>You will be responsible to ensure that any information pertaining to Mahvenx shall remain confidential and safeguarded. You will be solely responsible to ensure that any information, data, source code and other confidential documentation that are confidential and proprietary in nature will not be provided or disclosed to any third party.</p>
<h3>Non-compete Agreement:</h3>
<p>On separation from Mahvenx, you will not approach / work with any of the Mahvenx clients / partners either as an individual or as part of another organization directly / indirectly for a period of one year from date of relieving without prior written consent from Mahvenx. In case of violation of the non-compete, Mahvenx will have the option to pursue legal recourse against you.</p>
<div class="footer">Mahvenx It Solutions Pvt Ltd, 1st Floor, B Block, Kanaka Durga Mansion Plot No 52, 53, 5th Phase<br/>KPHB Colony, Hyderabad - 500 072<br/>Website: www.Mahvenx.com &nbsp;;&nbsp; Email: hr@Mahvenx.com</div>
</div>

<!-- ANNEXURE I PAGE 2 -->
<div class="page">
<div class="logo">M<span class="red">ahvenx</span></div><hr class="logo-rule"/>
<div class="footer-right">Mahvenx It Solutions Pvt Ltd, 1st Floor, B Block, Kanaka Durga Mansion <br/>Plot No 52, 53, 5th Phase<br/>KPHB Colony, Hyderabad - 500 072<br/>Website: www.Mahvenx.com &nbsp;;&nbsp; Email: hr@Mahvenx.com</div>
<h3>False Information:</h3>
<p>In case information furnished by you either in your application for employment or during the selection process or after joining duty is found to be incorrect/false, and/or it is found that you have suppressed any material information in respect to your qualification and past experiences, the company reserves the right to terminate your services anytime without notice or compensation in lieu thereof.</p>
<h3>Notice Period:</h3>
<p>We respect the individual's choice to change organizations. Towards this end, we assure you that we will endeavor to make your transition and separation a harmonious process. However, for the purpose of smooth business continuity, we expect you to follow the terms below:</p>
<ol>
  <li>During probation period, the employment can be terminated by giving 1 month notice by either party.</li>
  <li>After probation confirmation, termination of employment by either party shall be with 2 months' notice in writing. Unused leaves cannot be used for adjusting the notice period.</li>
  <li>No leaves will be allowed during the notice period and any unavoidable leaves will be Leave without Pay or extension of your employment with Mahvenx at the discretion of your Reporting Authority.</li>
</ol>
<h3>Termination:</h3>
<p>The company may terminate your employment with / without notice period or payment in lieu thereof, on the following grounds:</p>
<ol>
  <li>Breach of the terms and conditions mentioned in this agreement</li>
  <li>Based on poor performance and repeated negative feedback from client</li>
  <li>Being found guilty of serious misconduct like misappropriation, dereliction of duty in discharging your duties and functions</li>
  <li>Absence without approval for 5 contiguous working days</li>
  <li>Involved in the harassment of co-workers / associates in the work premises</li>
  <li>Being convicted of any criminal offence</li>
  <li>Mental or physical incapacity to discharge your functions</li>
  <li>Committing any material act of dishonesty detrimental to the interests of the Company</li>
</ol>
</div>

<!-- ANNEXURE II -->
<div class="page">
<div class="logo">M<span class="red">ahvenx</span></div><hr class="logo-rule"/>
<div class="footer-right">Mahvenx It Solutions Pvt Ltd, 1st Floor, B Block, Kanaka Durga Mansion <br/>Plot No 52, 53, 5th Phase<br/>KPHB Colony, Hyderabad - 500 072<br/>Website: www.Mahvenx.com &nbsp;;&nbsp; Email: hr@Mahvenx.com</div>
<div class="annex-title">Annexure – II</div>
<div class="annex-sub">Mahvenx Policies and Benefits</div>
<h3>Leaves:</h3>
<p class="left">Mahvenx follows calendar year for Leaves.</p>
<ol>
  <li><strong>Sick Leave or Casual Leave:</strong> Employees are entitled for 6 days of Sick Leaves (SL) and 6 days of Casual Leaves (CL) per annum. Unutilized SL or CL will lapse at the year-end i.e., on 31st December.</li>
  <li><strong>Marriage Leave:</strong> Upon completion of probation period, employees will be entitled for one week (five working days) paid holidays for getting married.</li>
  <li><strong>Maternity Leave:</strong> A female employee is eligible for Maternity leave after working for Mahvenx for 180 contiguous days prior to applying for the maternity leave for up to a maximum of 26 (Twenty-Six) weeks.</li>
  <li><strong>Paternity Leave:</strong> Upon completion of probation period, a male employee will be eligible for Paternity leave for 5 working days, to be availed within a month of the birth of his child.</li>
</ol>
<h3>Holidays:</h3>
<p>You will be eligible for the holidays as per the company policy. You will receive list of holidays on the day of your joining from HR.</p>
<h3>Referral Bonus:</h3>
<p>Mahvenx believes great employees know great talent. Mahvenx always encourage employees to refer their known talents to work with us. Mahvenx has a generous referral bonus policy in place. HR will share the details on your day one, and during orientation.</p>
<h3>Employee Engagement:</h3>
<p>Mahvenx focuses on all round and continuous engagements with all its employees. We organize activities such as annual outings, birthday bashes, festival celebrations, family events, sports tournaments, team lunches.</p>
<div class="footer">Mahvenx It Solutions Pvt Ltd, 1st Floor, B Block, Kanaka Durga Mansion Plot No 52, 53, 5th Phase<br/>KPHB Colony, Hyderabad - 500 072<br/>Website: www.Mahvenx.com &nbsp;;&nbsp; Email: hr@Mahvenx.com</div>
</div>

<!-- ANNEXURE III -->
<div class="page">
<div class="logo">M<span class="red">ahvenx</span></div><hr class="logo-rule"/>
<div class="footer-right">Mahvenx It Solutions Pvt Ltd, 1st Floor, B Block, Kanaka Durga Mansion <br/>Plot No 52, 53, 5th Phase<br/>KPHB Colony, Hyderabad - 500 072<br/>Website: www.Mahvenx.com &nbsp;;&nbsp; Email: hr@Mahvenx.com</div>
<div class="annex-title">ANNEXURE – III</div>
<div class="annex-sub">Required Documents</div>
<p>At the time of joining, you are requested to bring the following documents for Verification with a photo copy of each.</p>
<ol type="a">
  <li>Certificates supporting your educational qualifications (Schooling, Graduation, Post-Graduation)</li>
  <li>Your salary slips for the last 3months or a salary certificate from your previous organization, and Bank statement (for the last 6 months)</li>
  <li>Relieving letter and / or Service Certificate from your previous organization(s)</li>
  <li>Form 16 or Taxable Income Statement duly certified by previous employer (Statement showing deductions &amp; Taxable Income with break-up)</li>
  <li>Three passport sized color photographs</li>
  <li>Valid Passport, Driving License, PAN Card</li>
</ol>
<p class="note">Please note that PAN number is mandatory to for processing your payroll.</p>
<p>Your offer has been made based on the information furnished by you. If there are any discrepancies in the documents / certificates given by you in support of the above information, the Company reserves the right to revoke the offer.</p>
<div class="footer">Mahvenx It Solutions Pvt Ltd, 1st Floor, B Block, Kanaka Durga Mansion Plot No 52, 53, 5th Phase<br/>KPHB Colony, Hyderabad - 500 072<br/>Website: www.Mahvenx.com &nbsp;;&nbsp; Email: hr@Mahvenx.com</div>
</div>

<!-- ANNEXURE IV SALARY -->
<div class="page">
<div class="logo">M<span class="red">ahvenx</span></div><hr class="logo-rule"/>
<div class="footer-right">Mahvenx It Solutions Pvt Ltd, 1st Floor, B Block, Kanaka Durga Mansion <br/>Plot No 52, 53, 5th Phase<br/>KPHB Colony, Hyderabad - 500 072<br/>Website: www.Mahvenx.com &nbsp;;&nbsp; Email: hr@Mahvenx.com</div>
<div class="annex-title">Annexure – IV</div>
<div class="annex-title">Salary Structure</div>
<div class="annex-title">*ANNEXURE – I</div>
<table>
  <thead><tr><th style="width:8%">A</th><th>Salary</th><th class="r" style="width:32%">Amount Per Month</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>Basic Pay</td><td class="r">${fmt2(form.basicSalary)}</td></tr>
    <tr class="e"><td>2</td><td>House Rent Allowance</td><td class="r">${fmt2(form.hra)}</td></tr>
    <tr><td>3</td><td>Conveyance Allowance (10%)</td><td class="r">${fmt2(form.conveyanceAllowance)}</td></tr>
    <tr class="e"><td>4</td><td>Special Allowance (10%)</td><td class="r">${fmt2(form.specialAllowance)}</td></tr>
    <tr><td colspan="3">&nbsp;</td></tr>
    <tr class="lh"><td colspan="3">Less:</td></tr>
    <tr><td>1</td><td>Profession Tax</td><td class="r">${fmt2(form.professionTax)}</td></tr>
    <tr class="e"><td>2</td><td>**T.D.S (Tax deducted at source)</td><td class="r">${fmt2(form.tds)}</td></tr>
    <tr><td>3</td><td>PF Employee Contribution</td><td class="r">${fmt2(form.pfEmployee)}</td></tr>
    <tr class="e"><td>4</td><td>Others</td><td class="r">${fmt2(form.otherDeductions)}</td></tr>
  </tbody>
  <tfoot>
    <tr class="net"><td colspan="2"><strong>Net Salary per month</strong></td><td class="r"><strong>${fmt2(form.netSalary)}</strong></td></tr>
    <tr class="ctc"><td colspan="2">CTC per month</td><td class="r"><strong>${fmt2(form.grossSalary)}</strong></td></tr>
    <tr class="ctc e"><td colspan="2">CTC per annum</td><td class="r"><strong>${ctcAnnualFmt}</strong></td></tr>
  </tfoot>
</table>
<p class="note"><strong>Note:</strong></p>
<p class="note">1. ** Income Tax deduction per month is subject to your savings, bills etc.</p>
<p class="note">2. All the payments paid by the Company are included in calculation of your Income Tax</p>
<br/><br/>
<p class="left">Thank you.<br/>Sincerely,</p>
<div style="border-bottom:1pt solid #000;width:150pt;margin-top:18pt;margin-bottom:3pt;"></div>
<p class="left"><strong>Divya Madicharla</strong><br/>HR</p>
<div class="footer">Mahvenx It Solutions Pvt Ltd, 1st Floor, B Block, Kanaka Durga Mansion Plot No 52, 53, 5th Phase<br/>KPHB Colony, Hyderabad - 500 072<br/>Website: www.Mahvenx.com &nbsp;;&nbsp; Email: hr@Mahvenx.com</div>
</div>

</body></html>`;
  }
  const downloadLetter = () => {
    if (!form.fullName) { toast.error('Please fill employee name'); return; }
    const html = generateHTML();
    const fileName = `${form.fullName.replace(/ /g,'_')}.pdf`;
    // Open in new window and trigger print-to-PDF
    const w = window.open('', '_blank');
    if (!w) { toast.error('Allow pop-ups in browser settings'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    // Give browser time to render, then print
    setTimeout(() => {
      w.print();
      // Note: User saves as PDF from print dialog with filename
    }, 600);
    toast.success(`Print dialog opened — save as "${fileName}"`);
  };

  const inp = 'input w-full text-sm';
  const lbl = 'block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600"/> Offer Letter Generator
          </h2>
          <p className="text-sm text-gray-400">Generates exact Mahvenx offer letter with all annexures</p>
        </div>
      </div>

      {/* Step 1: Choose source */}
      {mode === 'select' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="font-bold text-gray-700 mb-4">Select employee source:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Existing */}
            <div className={clsx('border-2 rounded-2xl p-5 cursor-pointer transition-all',
              source==='existing'?'border-indigo-500 bg-indigo-50':'border-gray-200 hover:border-indigo-300')}
              onClick={()=>setSource('existing')}>
              <p className="font-bold text-gray-900 mb-1">📋 Existing Employee</p>
              <p className="text-sm text-gray-500">Load from payroll records — pulls all salary details automatically</p>
              {source==='existing' && (
                <div className="mt-3">
                  <select className="input w-full text-sm" value={selId}
                    onChange={e=>setSelId(e.target.value)}>
                    <option value="">-- Select employee --</option>
                    {employees.map((e:any) => (
                      <option key={e.id} value={e.id}>{e.fullName} — ₹{e.ctc}L CTC</option>
                    ))}
                  </select>
                  <button className="btn-primary mt-3 w-full justify-center"
                    disabled={!selId}
                    onClick={()=>loadEmployee(selId)}>
                    Load Employee Details →
                  </button>
                </div>
              )}
            </div>

            {/* New */}
            <div className={clsx('border-2 rounded-2xl p-5 cursor-pointer transition-all',
              source==='new'?'border-green-500 bg-green-50':'border-gray-200 hover:border-green-300')}
              onClick={()=>setSource('new')}>
              <p className="font-bold text-gray-900 mb-1">✨ New Candidate</p>
              <p className="text-sm text-gray-500">Enter details manually for a new hire not yet in payroll</p>
              {source==='new' && (
                <button className="btn-primary mt-4 w-full justify-center bg-green-600 border-green-600"
                  onClick={()=>{setForm(EMPTY_OL);setMode('edit');}}>
                  Enter New Candidate Details →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Edit & Preview */}
      {mode === 'edit' && (
        <div className="space-y-4">
          <button className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
            onClick={()=>setMode('select')}>
            ← Back to selection
          </button>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <p className="font-bold text-gray-800 text-sm border-b pb-2">📝 Offer Letter Details — all fields are editable</p>

            {/* Personal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={lbl}>Full Name *</label>
                <input className={clsx(inp,'text-base font-bold')} value={form.fullName}
                  onChange={e=>set('fullName',e.target.value)} placeholder="Employee Full Name"/>
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Address * <span className="text-gray-400 font-normal normal-case">(each line becomes a separate line in letter)</span></label>
                <textarea className="input w-full text-sm min-h-[80px] resize-none"
                  value={form.address}
                  onChange={e=>set('address',e.target.value)}
                  placeholder="D/o Parent Name, Door No, Street, Village, District. Pin code: 000000"/>
              </div>
              <div>
                <label className={lbl}>Designation *</label>
                <input className={inp} value={form.designation}
                  onChange={e=>set('designation',e.target.value)} placeholder="Software Associate"/>
              </div>
              <div>
                <label className={lbl}>Date of Joining *</label>
                <input className={inp} type="date" value={form.joiningDate}
                  onChange={e=>set('joiningDate',e.target.value)}/>
              </div>
            </div>

            {/* CTC */}
            <div>
              <label className={lbl}>Annual CTC (Lakhs) * <span className="text-gray-400 font-normal normal-case">— e.g. 3 = ₹3,00,000</span></label>
              <input className="input w-full text-xl font-black text-green-700" type="number"
                step="0.1" min="0" value={form.ctc}
                onChange={e=>set('ctc',e.target.value)} placeholder="3.0"/>
              {form.ctc && <p className="text-sm text-green-600 mt-1 font-bold">
                ₹{Number(Number(form.ctc)*100000).toLocaleString('en-IN')} per year ({ctcWords} Rupees Only)
              </p>}
            </div>

            {/* Salary breakdown */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-black text-gray-500 uppercase mb-3">Salary Structure (Annexure IV)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><label className={lbl}>Basic Pay (/mo)</label><input className={inp} type="number" value={form.basicSalary} onChange={e=>set('basicSalary',e.target.value)} placeholder="12500"/></div>
                <div><label className={lbl}>HRA (/mo)</label><input className={inp} type="number" value={form.hra} onChange={e=>set('hra',e.target.value)} placeholder="7500"/></div>
                <div><label className={lbl}>Conveyance (/mo)</label><input className={inp} type="number" value={form.conveyanceAllowance} onChange={e=>set('conveyanceAllowance',e.target.value)} placeholder="2500"/></div>
                <div><label className={lbl}>Special Allow (/mo)</label><input className={inp} type="number" value={form.specialAllowance} onChange={e=>set('specialAllowance',e.target.value)} placeholder="2500"/></div>
                <div><label className={lbl}>Profession Tax</label><input className={inp} type="number" value={form.professionTax} onChange={e=>set('professionTax',e.target.value)} placeholder="0"/></div>
                <div><label className={lbl}>TDS (/mo)</label><input className={inp} type="number" value={form.tds} onChange={e=>set('tds',e.target.value)} placeholder="200"/></div>
                <div><label className={lbl}>PF Employee</label><input className={inp} type="number" value={form.pfEmployee} onChange={e=>set('pfEmployee',e.target.value)} placeholder="0"/></div>
                <div><label className={lbl}>Others</label><input className={inp} type="number" value={form.otherDeductions} onChange={e=>set('otherDeductions',e.target.value)} placeholder="0"/></div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-center"><p className="text-xs text-gray-400">CTC/month</p><p className="font-black text-gray-800">₹{Number(form.grossSalary||0).toLocaleString('en-IN')}</p></div>
                <div className="text-center"><p className="text-xs text-gray-400">Net Salary/month</p>
                  <input className="input text-center font-black text-green-700 text-base" type="number"
                    value={form.netSalary} onChange={e=>set('netSalary',e.target.value)} placeholder="24800"/>
                </div>
                <div className="text-center"><p className="text-xs text-gray-400">CTC/annum</p><p className="font-black text-purple-700">₹{Number(ctcAnnual).toLocaleString('en-IN')}</p></div>
              </div>
            </div>
          </div>

          {/* Download button */}
          <div className="flex gap-3">
            <button
              className="btn-primary flex-1 justify-center py-4 text-base font-black rounded-2xl"
              onClick={downloadLetter}>
              <Download className="w-5 h-5"/>
              Download Offer Letter PDF — {form.fullName || 'Employee'}.pdf
            </button>
          </div>
          <p className="text-xs text-center text-gray-400">
            💡 Print dialog will open → select "Save as PDF" → filename: <strong>{(form.fullName||'Employee').replace(/ /g,'_')}.pdf</strong>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Payslip Month Selector ──────────────────────────────────────
function PayslipModal({ record, onClose }: { record: any; onClose: () => void }) {
  const curYear  = new Date().getFullYear();
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year,  setYear]  = useState(curYear);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600"/> Download Payslip
          </h3>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl"><X className="w-4 h-4"/></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Employee</label>
            <p className="font-bold text-gray-800">{record.fullName}</p>
            <p className="text-xs text-gray-400">{record.designation} · ₹{Number(record.netSalary||0).toLocaleString('en-IN')}/mo net</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Month</label>
            <select className="input w-full" value={month} onChange={e=>setMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Year</label>
            <select className="input w-full" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[curYear-1, curYear, curYear+1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            className="btn-primary flex-1 justify-center"
            onClick={() => {
              // Build simple payslip HTML
            const fmt2 = (n: any) => n ? Number(n).toLocaleString('en-IN', {minimumFractionDigits:2}) : '00.00';
            const daysInMonth = new Date(year, MONTHS.indexOf(month) + 1, 0).getDate();
            const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
@page{size:A4;margin:15mm 18mm;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:11pt;color:#000;}
.logo{font-size:20pt;font-weight:900;color:#1a237e;}.logo .red{color:#c62828;}
.rule{border:none;border-top:2pt solid #1a237e;margin:6pt 0 12pt;}
.title{text-align:center;font-weight:bold;font-size:13pt;margin:8pt 0;}
.info{display:grid;grid-template-columns:1fr 1fr;gap:4pt;margin:10pt 0;}
.row{display:flex;gap:8pt;padding:3pt 0;border-bottom:1pt dotted #ddd;font-size:10pt;}
.lbl{color:#555;min-width:120pt;}.val{font-weight:600;}
table{width:100%;border-collapse:collapse;margin:10pt 0;font-size:10pt;}
th{background:#1a237e;color:#fff;padding:6pt 8pt;text-align:left;border:0.5pt solid #888;}
th.r,td.r{text-align:right;}
td{padding:5pt 8pt;border:0.5pt solid #bbb;}
tr.e td{background:#f5f5f5;}
tr.net td{font-weight:bold;background:#1a237e;color:#fff;font-size:12pt;}
.sig{display:flex;justify-content:space-between;margin-top:28pt;}
.sig-line{border-bottom:1pt solid #000;width:160pt;margin-top:24pt;margin-bottom:3pt;}
.footer{border-top:0.5pt solid #888;padding-top:4pt;margin-top:12pt;font-size:8pt;color:#555;text-align:center;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="logo">M<span class="red">ahvenx</span></div><hr class="rule"/>
<div class="title">SALARY SLIP — ${month.toUpperCase()} ${year}</div>
<div class="info">
  <div>
    <div class="row"><span class="lbl">Employee Name</span><span class="val">${record.fullName}</span></div>
    <div class="row"><span class="lbl">Designation</span><span class="val">${record.designation||'—'}</span></div>
    <div class="row"><span class="lbl">Department</span><span class="val">${record.department||'—'}</span></div>
    <div class="row"><span class="lbl">Date of Joining</span><span class="val">${record.joiningDate?.split('T')[0]||record.payrollFromDate?.split('T')[0]||'—'}</span></div>
    <div class="row"><span class="lbl">PAN Number</span><span class="val">${record.panCard||'—'}</span></div>
  </div>
  <div>
    <div class="row"><span class="lbl">Pay Period</span><span class="val">01–${daysInMonth} ${month} ${year}</span></div>
    <div class="row"><span class="lbl">Bank Name</span><span class="val">${record.bankName||'—'}</span></div>
    <div class="row"><span class="lbl">Account No.</span><span class="val">${record.accountNumber?'****'+record.accountNumber.slice(-4):'—'}</span></div>
    <div class="row"><span class="lbl">IFSC Code</span><span class="val">${record.ifscCode||'—'}</span></div>
    <div class="row"><span class="lbl">PF Number</span><span class="val">${record.pfNumber||'—'}</span></div>
  </div>
</div>
<table>
  <thead><tr><th>Earnings</th><th class="r">Amount (₹)</th><th>Deductions</th><th class="r">Amount (₹)</th></tr></thead>
  <tbody>
    <tr><td>Basic Pay</td><td class="r">${fmt2(record.basicSalary)}</td><td>PF Employee (12%)</td><td class="r">${fmt2(record.pfEmployee)}</td></tr>
    <tr class="e"><td>House Rent Allowance</td><td class="r">${fmt2(record.hra)}</td><td>TDS</td><td class="r">${fmt2(record.tds)}</td></tr>
    <tr><td>Conveyance Allowance</td><td class="r">${fmt2(record.conveyanceAllowance)}</td><td>Profession Tax</td><td class="r">${fmt2(record.professionTax)}</td></tr>
    <tr class="e"><td>Special Allowance</td><td class="r">${fmt2(record.specialAllowance)}</td><td>Others</td><td class="r">${fmt2(record.otherDeductions)}</td></tr>
    <tr><td><strong>Gross Salary</strong></td><td class="r"><strong>${fmt2(record.grossSalary)}</strong></td><td><strong>Total Deductions</strong></td><td class="r"><strong>${fmt2(record.totalDeductions)}</strong></td></tr>
    <tr class="net"><td colspan="3"><strong>NET SALARY</strong></td><td class="r"><strong>₹ ${fmt2(record.netSalary)}</strong></td></tr>
  </tbody>
</table>
<p style="font-size:9pt;color:#555;margin:4pt 0;">Net salary paid via bank transfer to account ****${record.accountNumber?.slice(-4)||'XXXX'}, ${record.bankName||'Bank'}.</p>
<div class="sig">
  <div><div class="sig-line"></div><strong>Employee Signature</strong></div>
  <div><div class="sig-line"></div><strong>HR Signature</strong><br/>Mahvenx IT Solutions</div>
</div>
<div class="footer">This is a system-generated salary slip. | Mahvenx It Solutions Pvt Ltd | www.Mahvenx.com | hr@Mahvenx.com</div>
</body></html>`;
              printHTML(html, `payslip-${record.fullName.replace(/ /g,'-')}-${month}-${year}`);
              toast.success(`Payslip ready for ${month} ${year}`);
            }}>
            <Printer className="w-4 h-4"/> Print / Download
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add/Edit Modal ──────────────────────────────────────────────
function PayrollModal({ record, orgId, onClose }: { record: any; orgId: number; onClose: () => void }) {
  const qc     = useQueryClient();
  const isEdit = !!record?.id;
  const [form, setForm] = useState<any>(isEdit ? {
    ...EMPTY, ...record,
    ctc: record.ctc ?? '',
    grossSalary: record.grossSalary ?? '',
    basicSalary: record.basicSalary ?? '',
    hra: record.hra ?? '',
    conveyanceAllowance: record.conveyanceAllowance ?? '',
    specialAllowance: record.specialAllowance ?? '',
    pfEmployee: record.pfEmployee ?? '',
    pfEmployer: record.pfEmployer ?? '',
    tds: record.tds ?? '200',
    professionTax: record.professionTax ?? '0',
    otherDeductions: record.otherDeductions ?? '0',
    totalDeductions: record.totalDeductions ?? '',
    netSalary: record.netSalary ?? '',
    gstAmount: record.gstAmount ?? '',
    payrollFromDate: record.payrollFromDate ? record.payrollFromDate.split('T')[0] : '',
    payrollToDate: record.payrollToDate ? record.payrollToDate.split('T')[0] : '',
    joiningDate: record.joiningDate ? record.joiningDate.split('T')[0] : '',
    paymentDay: record.paymentDay ?? '1',
    pfRequired: record.pfRequired ?? 'No',
    gstApplicable: record.gstApplicable ?? 'No',
    status: record.status ?? 'Active',
  } : EMPTY);

  const set = (k: string, v: any) => setForm((p: any) => {
    const updated = { ...p, [k]: v };
    if (['ctc','pfRequired','gstApplicable','tds','professionTax','otherDeductions','basicSalary','hra','conveyanceAllowance','specialAllowance'].includes(k)) {
      const c = calcAll(updated);
      updated.grossSalary         = String(c.gross);
      updated.basicSalary         = k === 'basicSalary' ? v : String(c.basic);
      updated.hra                 = k === 'hra' ? v : String(c.hra);
      updated.conveyanceAllowance = k === 'conveyanceAllowance' ? v : String(c.convey);
      updated.specialAllowance    = k === 'specialAllowance' ? v : String(c.special);
      updated.pfEmployee          = String(c.pfEmp);
      updated.pfEmployer          = String(c.pfEmpl);
      updated.tds                 = k === 'tds' ? v : String(c.tds);
      updated.professionTax       = k === 'professionTax' ? v : String(c.pt);
      updated.otherDeductions     = k === 'otherDeductions' ? v : String(c.others);
      updated.totalDeductions     = String(c.totalDed);
      updated.netSalary           = String(c.net);
      updated.gstAmount           = String(c.gst);
    }
    return updated;
  });

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        ctc: Number(form.ctc),
        grossSalary: Number(form.grossSalary)||null,
        basicSalary: Number(form.basicSalary)||null,
        hra: Number(form.hra)||null,
        conveyanceAllowance: Number(form.conveyanceAllowance)||null,
        specialAllowance: Number(form.specialAllowance)||null,
        pfEmployee: Number(form.pfEmployee)||null,
        pfEmployer: Number(form.pfEmployer)||null,
        tds: Number(form.tds)||null,
        professionTax: Number(form.professionTax)||null,
        otherDeductions: Number(form.otherDeductions)||null,
        totalDeductions: Number(form.totalDeductions)||null,
        netSalary: Number(form.netSalary)||null,
        gstAmount: Number(form.gstAmount)||null,
        paymentDay: Number(form.paymentDay)||1,
        payrollFromDate: new Date(form.payrollFromDate).toISOString(),
        payrollToDate: form.payrollToDate ? new Date(form.payrollToDate).toISOString() : null,
        joiningDate: form.joiningDate ? new Date(form.joiningDate).toISOString() : null,
        organizationId: orgId,
      };
      return isEdit ? api.put(`/payroll/${record.id}`, payload) : api.post('/payroll', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Payroll updated!' : 'Payroll record created!');
      qc.invalidateQueries({ queryKey: ['payroll'] });
      onClose();
    },
    onError: () => toast.error('Failed to save'),
  });

  const inp = 'input w-full text-sm';
  const lbl = 'block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide';
  const sec = 'font-bold text-gray-800 flex items-center gap-2 mb-3 mt-1 pb-2 border-b border-gray-100 text-sm';
  const calc= (v: any) => v ? `₹${Number(v).toLocaleString('en-IN')}` : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-6">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600"/>
            {isEdit ? 'Edit Payroll Record' : 'Add New Payroll Record'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-5 space-y-5">

          {/* ── Personal ── */}
          <div>
            <p className={sec}><User className="w-4 h-4 text-indigo-500"/> Personal Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1"><label className={lbl}>Full Name *</label><input className={inp} value={form.fullName} onChange={e=>set('fullName',e.target.value)} placeholder="Employee Full Name"/></div>
              <div><label className={lbl}>Email *</label><input className={inp} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="employee@email.com"/></div>
              <div><label className={lbl}>Phone *</label><input className={inp} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+91 9876543210"/></div>
              <div><label className={lbl}>Designation</label><input className={inp} value={form.designation} onChange={e=>set('designation',e.target.value)} placeholder="Software Associate"/></div>
              <div><label className={lbl}>Department</label><input className={inp} value={form.department} onChange={e=>set('department',e.target.value)} placeholder="Engineering"/></div>
              <div><label className={lbl}>Domain</label>
                <select className={inp} value={form.domain} onChange={e=>set('domain',e.target.value)}>
                  {DOMAINS.filter(d=>d!=='All').map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label className={lbl}>Address</label><input className={inp} value={form.address} onChange={e=>set('address',e.target.value)} placeholder="D/o Parent Name, Door No, Street, City. Pin code: 000000"/></div>
              <div><label className={lbl}>Date of Joining</label><input className={inp} type="date" value={form.joiningDate} onChange={e=>set('joiningDate',e.target.value)}/></div>
            </div>
          </div>

          {/* ── Salary ── */}
          <div>
            <p className={sec}><DollarSign className="w-4 h-4 text-green-500"/> Salary Structure <span className="text-xs font-normal text-green-600 ml-2">— auto-calculates from CTC</span></p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Annual CTC (Lakhs) * <span className="text-gray-400 font-normal normal-case">e.g. 3 = ₹3,00,000</span></label>
                <input className="input w-full text-lg font-black text-green-700" type="number" step="0.1" min="0"
                  value={form.ctc} onChange={e=>set('ctc',e.target.value)} placeholder="3.0"/>
                {form.ctc && <p className="text-xs text-green-600 mt-0.5">= ₹{Number(Number(form.ctc)*100000).toLocaleString('en-IN')} per year · ₹{Number(form.grossSalary).toLocaleString('en-IN')}/month CTC</p>}
              </div>
              <div className="col-span-2">
                <label className={lbl}>GST Applicable (18% on monthly gross)</label>
                <div className="flex gap-2 mt-1">
                  {['Yes','No'].map(v=>(
                    <button key={v} type="button"
                      className={clsx('flex-1 py-2 rounded-lg text-sm font-bold border transition-all',
                        form.gstApplicable===v?(v==='Yes'?'bg-orange-500 text-white border-orange-500':'bg-gray-100 text-gray-700 border-gray-200'):'bg-white border-gray-200 text-gray-400')}
                      onClick={()=>set('gstApplicable',v)}>
                      {v==='Yes'?'💼 Yes (18%)':'❌ No'}
                    </button>
                  ))}
                </div>
                {form.gstApplicable==='Yes' && form.gstAmount && <p className="text-xs text-orange-600 mt-1">GST = ₹{Number(form.gstAmount).toLocaleString('en-IN')}/month</p>}
              </div>
            </div>

            {/* Earnings breakdown */}
            <div className="mt-3 bg-green-50 rounded-2xl p-4">
              <p className="text-xs font-black text-green-700 uppercase mb-3">📊 Earnings Breakdown (Monthly)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><label className={lbl}>Basic Pay</label>
                  <input className={inp} type="number" value={form.basicSalary} onChange={e=>set('basicSalary',e.target.value)} placeholder="12,500"/>
                  <p className="text-xs text-gray-400 mt-0.5">{calc(form.basicSalary)}</p>
                </div>
                <div><label className={lbl}>HRA</label>
                  <input className={inp} type="number" value={form.hra} onChange={e=>set('hra',e.target.value)} placeholder="7,500"/>
                  <p className="text-xs text-gray-400 mt-0.5">{calc(form.hra)}</p>
                </div>
                <div><label className={lbl}>Conveyance Allowance</label>
                  <input className={inp} type="number" value={form.conveyanceAllowance} onChange={e=>set('conveyanceAllowance',e.target.value)} placeholder="2,500"/>
                  <p className="text-xs text-gray-400 mt-0.5">{calc(form.conveyanceAllowance)}</p>
                </div>
                <div><label className={lbl}>Special Allowance</label>
                  <input className={inp} type="number" value={form.specialAllowance} onChange={e=>set('specialAllowance',e.target.value)} placeholder="2,500"/>
                  <p className="text-xs text-gray-400 mt-0.5">{calc(form.specialAllowance)}</p>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="mt-3 bg-red-50 rounded-2xl p-4">
              <p className="text-xs font-black text-red-700 uppercase mb-3">📉 Deductions (Monthly)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={lbl}>PF Required *</label>
                  <div className="flex gap-2 mt-1">
                    {['Yes','No'].map(v=>(
                      <button key={v} type="button"
                        className={clsx('flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all',
                          form.pfRequired===v?(v==='Yes'?'bg-blue-600 text-white border-blue-600':'bg-gray-200 text-gray-700 border-gray-300'):'bg-white border-gray-200 text-gray-400')}
                        onClick={()=>set('pfRequired',v)}>
                        {v==='Yes'?'✅ PF':'❌ No PF'}
                      </button>
                    ))}
                  </div>
                </div>
                {form.pfRequired==='Yes' && <>
                  <div><label className={lbl}>PF Employee (12%)</label>
                    <input className="input w-full text-sm bg-blue-50 text-blue-700 font-bold" readOnly value={form.pfEmployee} placeholder="1,500"/>
                    <p className="text-xs text-blue-500 mt-0.5">Auto = 12% of basic</p>
                  </div>
                  <div><label className={lbl}>PF Employer (12%)</label>
                    <input className="input w-full text-sm bg-purple-50 text-purple-700 font-bold" readOnly value={form.pfEmployer} placeholder="1,500"/>
                  </div>
                  <div><label className={lbl}>PF Number</label>
                    <input className={inp} value={form.pfNumber} onChange={e=>set('pfNumber',e.target.value)} placeholder="PF/MH/12345"/>
                  </div>
                </>}
                <div><label className={lbl}>TDS (₹/month)</label>
                  <input className={inp} type="number" value={form.tds} onChange={e=>set('tds',e.target.value)} placeholder="200"/>
                </div>
                <div><label className={lbl}>Profession Tax</label>
                  <input className={inp} type="number" value={form.professionTax} onChange={e=>set('professionTax',e.target.value)} placeholder="0"/>
                </div>
                <div><label className={lbl}>Other Deductions</label>
                  <input className={inp} type="number" value={form.otherDeductions} onChange={e=>set('otherDeductions',e.target.value)} placeholder="0"/>
                </div>
              </div>
            </div>

            {/* Net summary */}
            {form.grossSalary && (
              <div className="mt-3 bg-gray-900 rounded-2xl p-4 grid grid-cols-3 gap-4 text-center">
                <div><p className="text-xs text-gray-400 mb-1">Gross/month</p><p className="text-lg font-black text-white">₹{Number(form.grossSalary).toLocaleString('en-IN')}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Total Deductions</p><p className="text-lg font-black text-red-400">- ₹{Number(form.totalDeductions).toLocaleString('en-IN')}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Net Salary/month</p><p className="text-2xl font-black text-green-400">₹{Number(form.netSalary).toLocaleString('en-IN')}</p></div>
              </div>
            )}
          </div>

          {/* ── Payroll Dates ── */}
          <div>
            <p className={sec}><Calendar className="w-4 h-4 text-purple-500"/> Payroll Dates</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className={lbl}>Payroll From Date *</label><input className={inp} type="date" value={form.payrollFromDate} onChange={e=>set('payrollFromDate',e.target.value)}/></div>
              <div><label className={lbl}>Payroll To Date <span className="text-gray-400 normal-case font-normal">(optional)</span></label><input className={inp} type="date" value={form.payrollToDate} onChange={e=>set('payrollToDate',e.target.value)}/></div>
              <div>
                <label className={lbl}>Payment Day of Month</label>
                <select className={inp} value={form.paymentDay} onChange={e=>set('paymentDay',e.target.value)}>
                  {Array.from({length:28},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}th</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Status</label>
                <select className={inp} value={form.status} onChange={e=>set('status',e.target.value)}>
                  <option value="Active">✅ Active</option>
                  <option value="Inactive">⏹ Inactive</option>
                  <option value="OnHold">⏸ On Hold</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Bank ── */}
          <div>
            <p className={sec}><Banknote className="w-4 h-4 text-blue-500"/> Bank Account Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div><label className={lbl}>Bank Name</label><input className={inp} value={form.bankName} onChange={e=>set('bankName',e.target.value)} placeholder="State Bank of India"/></div>
              <div><label className={lbl}>Account Number</label><input className={inp} value={form.accountNumber} onChange={e=>set('accountNumber',e.target.value)} placeholder="12345678901"/></div>
              <div><label className={lbl}>IFSC Code *</label><input className={inp} value={form.ifscCode} onChange={e=>set('ifscCode',e.target.value.toUpperCase())} placeholder="SBIN0001234"/></div>
              <div><label className={lbl}>Account Holder Name</label><input className={inp} value={form.accountHolderName} onChange={e=>set('accountHolderName',e.target.value)} placeholder="Employee Full Name"/></div>
              <div><label className={lbl}>Bank Branch</label><input className={inp} value={form.bankBranch} onChange={e=>set('bankBranch',e.target.value)} placeholder="Hyderabad Main"/></div>
            </div>
          </div>

          {/* ── KYC ── */}
          <div>
            <p className={sec}><Shield className="w-4 h-4 text-amber-500"/> KYC Documents</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={lbl}>PAN Card * <span className="text-red-500">Mandatory for payroll</span></label>
                <input className={inp} value={form.panCard} onChange={e=>set('panCard',e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10}/>
                <p className="text-xs text-gray-400 mt-0.5">Format: AAAAA9999A</p>
              </div>
              <div>
                <label className={lbl}>Aadhaar Card Number</label>
                <input className={inp} value={form.aadharCard} onChange={e=>set('aadharCard',e.target.value)} placeholder="1234 5678 9012" maxLength={14}/>
              </div>
              <div>
                <label className={lbl}>Additional Documents</label>
                <input className={inp} value={form.additionalDocuments} onChange={e=>set('additionalDocuments',e.target.value)} placeholder="Offer Letter, Relieving Letter, PF Form"/>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
            <textarea className="input w-full min-h-[50px] resize-none text-sm" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Additional remarks…"/>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-3xl">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            className="btn-primary px-6"
            disabled={!form.fullName || !form.email || !form.ctc || !form.payrollFromDate || saveMut.isPending}
            onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? 'Saving…' : isEdit ? '💾 Update' : '➕ Add Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function PayrollPage() {
  const { user }    = useAuthStore();
  const qc          = useQueryClient();
  const orgId       = user?.organizationId ?? 0;
  const [activeTab,  setActiveTab]  = useState<'payroll'|'offer'>('payroll');
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('All');
  const [domain,     setDomain]     = useState('All');
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<any>(null);
  const [payslipFor, setPayslipFor] = useState<any>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['payroll', orgId, search, status, domain],
    queryFn:  () => api.get('/payroll', { params: { orgId, search, status, domain } }).then(r => r.data),
    enabled:  !!orgId,
  });

  const { data: stats } = useQuery({
    queryKey: ['payroll-stats', orgId],
    queryFn:  () => api.get('/payroll/stats', { params: { orgId } }).then(r => r.data),
    enabled:  !!orgId,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/payroll/${id}`),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['payroll'] }); },
    onError:   () => toast.error('Delete failed'),
  });

  const list = records as any[];
  const fmt  = (n: any) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

  const exportCSV = () => {
    const h = 'Name,Email,Phone,Designation,Domain,CTC(LPA),Gross/mo,Net/mo,PF,TDS,GST,FromDate,PAN,IFSC,Bank,Status\n';
    const r = list.map(r => `"${r.fullName}","${r.email}","${r.phone}","${r.designation??''}","${r.domain??''}","${r.ctc}","${r.grossSalary??''}","${r.netSalary??''}","${r.pfRequired}","${r.tds??''}","${r.gstAmount??''}","${r.payrollFromDate?.split('T')[0]??''}","${r.panCard??''}","${r.ifscCode??''}","${r.bankName??''}","${r.status}"`).join('\n');
    const b = new Blob([h+r], {type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download='payroll.csv'; a.click();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600"/> Payroll Management
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage salaries, payslips, offer letters and KYC</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4"/> Export CSV
          </button>
          <button onClick={()=>{setEditing(null);setShowForm(true);}} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4"/> Add Employee
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-2xl overflow-hidden">
        <button
          className={clsx('px-6 py-3 font-bold text-sm transition-colors flex items-center gap-2',
            activeTab==='payroll'?'border-b-2 border-indigo-600 text-indigo-600 bg-white':'text-gray-400 hover:text-gray-600')}
          onClick={()=>setActiveTab('payroll')}>
          <DollarSign className="w-4 h-4"/> Payroll Records
        </button>
        <button
          className={clsx('px-6 py-3 font-bold text-sm transition-colors flex items-center gap-2',
            activeTab==='offer'?'border-b-2 border-indigo-600 text-indigo-600 bg-white':'text-gray-400 hover:text-gray-600')}
          onClick={()=>setActiveTab('offer')}>
          <FileText className="w-4 h-4"/> Offer Letters
        </button>
      </div>

      {activeTab === 'offer' && <OfferLetterTab employees={list}/>}
      {activeTab === 'payroll' && <>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label:'Total',         value: stats.total,          color:'text-gray-800',    bg:'bg-gray-50' },
            { label:'Active',        value: stats.active,         color:'text-green-700',   bg:'bg-green-50' },
            { label:'Inactive',      value: stats.inactive,       color:'text-gray-500',    bg:'bg-gray-100' },
            { label:'On Hold',       value: stats.onHold,         color:'text-amber-700',   bg:'bg-amber-50' },
            { label:'PF Enrolled',   value: stats.pfEnrolled,     color:'text-blue-700',    bg:'bg-blue-50' },
            { label:'Total CTC/yr',  value: `₹${Math.round(stats.totalCTC||0)}L`, color:'text-purple-700', bg:'bg-purple-50' },
            { label:'Net Payable/mo',value: `₹${Number(stats.totalNetSalary||0).toLocaleString('en-IN')}`, color:'text-emerald-700', bg:'bg-emerald-50' },
          ].map(s=>(
            <div key={s.label} className={clsx('rounded-2xl p-4 text-center border border-gray-100', s.bg)}>
              <p className={clsx('text-xl font-black', s.color)}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9 w-full text-sm" placeholder="Search name, email, PAN…"
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="input text-sm" value={domain} onChange={e=>setDomain(e.target.value)}>
          {DOMAINS.map(d=><option key={d}>{d==='All'?'All Domains':d}</option>)}
        </select>
        <select className="input text-sm" value={status} onChange={e=>setStatus(e.target.value)}>
          {STATUSES.map(s=><option key={s}>{s==='All'?'All Status':s}</option>)}
        </select>
        <span className="text-xs text-gray-400">{list.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Employee','Domain','CTC','Basic','HRA','PF','TDS','Deductions','Net/mo','PAN','Status','Actions'].map(h=>(
                <th key={h} className="py-3 px-3 text-xs font-bold text-gray-400 uppercase text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={12} className="py-10 text-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"/></td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={12} className="py-12 text-center text-gray-400"><DollarSign className="w-10 h-10 mx-auto mb-2 text-gray-200"/><p>No payroll records yet</p></td></tr>
            ) : list.map((r:any) => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-black text-xs flex-shrink-0">
                      {r.fullName.split(' ').map((n:string)=>n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{r.fullName}</p>
                      <p className="text-xs text-gray-400">{r.designation}</p>
                      <a href={`mailto:${r.email}`} className="text-xs text-indigo-500">{r.email}</a>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3"><span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">{r.domain}</span></td>
                <td className="py-3 px-3 font-black text-purple-700">₹{r.ctc}L</td>
                <td className="py-3 px-3 text-gray-700">{fmt(r.basicSalary)}</td>
                <td className="py-3 px-3 text-gray-700">{fmt(r.hra)}</td>
                <td className="py-3 px-3">
                  <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded',
                    r.pfRequired==='Yes'?'bg-blue-100 text-blue-700':'text-gray-400')}>
                    {r.pfRequired==='Yes'?`✅ ${fmt(r.pfEmployee)}`:'No PF'}
                  </span>
                </td>
                <td className="py-3 px-3 text-gray-700">{fmt(r.tds)}</td>
                <td className="py-3 px-3 text-red-600 font-bold">- {fmt(r.totalDeductions)}</td>
                <td className="py-3 px-3"><span className="font-black text-green-700 text-base">{fmt(r.netSalary)}</span></td>
                <td className="py-3 px-3 font-mono text-xs text-gray-700">{r.panCard||'—'}</td>
                <td className="py-3 px-3">
                  <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
                    r.status==='Active'?'bg-green-100 text-green-700':r.status==='OnHold'?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-500')}>
                    {r.status}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title="Download Payslip"
                      onClick={()=>setPayslipFor(r)}>
                      <FileText className="w-4 h-4"/>
                    </button>

                    <button className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400" title="Edit"
                      onClick={()=>{setEditing(r);setShowForm(true);}}>
                      <Pencil className="w-4 h-4"/>
                    </button>
                    <button className="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="Delete"
                      onClick={()=>{if(confirm(`Delete ${r.fullName}?`))deleteMut.mutate(r.id);}}>
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    <span className="text-xs text-green-600 cursor-pointer" onClick={()=>setPayslipFor(r)}>📄 Payslip</span>

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      </> }

      {showForm   && <PayrollModal record={editing} orgId={orgId} onClose={()=>{setShowForm(false);setEditing(null);}}/>}
      {payslipFor && <PayslipModal record={payslipFor} onClose={()=>setPayslipFor(null)}/>}
    </div>
  );
}