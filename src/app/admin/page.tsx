'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, query, writeBatch, getDocs, orderBy, updateDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Loader2, 
  MapPin, 
  Mail, 
  Phone, 
  User, 
  Building, 
  DollarSign, 
  ShoppingBag, 
  BarChart3, 
  ListChecks, 
  Utensils, 
  RefreshCw, 
  AlertTriangle, 
  Info, 
  ExternalLink,
  Target,
  Briefcase,
  TrendingUp,
  PhoneCall,
  ClipboardList,
  Search,
  Filter,
  Activity,
  ListOrdered,
  Timer,
  Hash,
  Map as MapIcon,
  Percent,
  Settings2,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Table as TableIcon,
  Layers,
  ArrowUpRight,
  Printer,
  FileText,
  CreditCard,
  QrCode
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import {
  RadioGroup,
  RadioGroupItem
} from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Seller, Order, Prospect, SalesActivity, ProspectStage } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isToday, isThisMonth, isThisYear, format, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { cn, getNumericOrderId } from '@/lib/utils';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import Image from 'next/image';

const sellerSchema = z.object({
  courseName: z.string().min(2, 'Seller name must be at least 2 characters'),
  type: z.enum(['Private Golf Course', 'Semi Private Golf Course', 'Public Golf Course', 'Bowling Alley', 'Brewery', 'Restaurant'], {
    required_error: "Please select a seller type",
  }),
  menuTypes: z.array(z.string()).min(1, 'Please select at least one menu type'),
  halfwayHouseCount: z.coerce.number().min(0).optional(),
  halfwayHouseNames: z.array(z.string()).optional(),
  laneCount: z.coerce.number().min(0).optional(),
  tableCount: z.coerce.number().min(0).optional(),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State (e.g. CA) is required').max(2, 'Use 2-letter state code'),
  zip: z.string().min(5, 'ZIP code must be at least 5 digits').max(10, 'Invalid ZIP code'),
  contactName: z.string().min(2, 'Contact person name is required'),
  contactEmail: z.string().email('Please enter a valid email address'),
  contactPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  serviceFee: z.coerce.number().min(0, 'Default convenience fee cannot be negative'),
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate seems too high').default(6.0),
  menuServiceFees: z.record(z.string(), z.coerce.number().min(0).optional()).optional(),
  monthlyPlatformFee: z.coerce.number().min(0).optional(),
  launchFee: z.coerce.number().min(0).optional(),
  status: z.enum(['Active', 'Inactive']),
});

type SellerFormData = z.infer<typeof sellerSchema>;

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

const getMenuOptionsForType = (type: string) => {
  switch (type) {
    case 'Private Golf Course':
    case 'Semi Private Golf Course':
      return ["Beverage Cart", "Clubhouse", "Pool", "Take Out", "Halfway House"];
    case 'Public Golf Course':
      return ["Beverage Cart", "Clubhouse", "Take Out", "Halfway House"];
    case 'Brewery':
    case 'Restaurant':
      return ["Take Out", "Dine-In"];
    case 'Bowling Alley':
      return ["Take Out", "Lane Delivery"];
    default:
      return [];
  }
};

function GlobalStatCard({ title, revenue, orders, avgTransaction }: { title: string, revenue: number, orders: number, avgTransaction: number }) {
  return (
    <Card className="flex-1 min-w-[280px] shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-headline flex items-center gap-2">
           <BarChart3 className="h-4 w-4 text-primary" />
           {title} Sales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Revenue (Fees)</span>
          </div>
          <span className="font-mono font-bold text-sm">${revenue.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Orders</span>
          </div>
          <span className="font-mono font-bold text-sm">{orders}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Avg Transaction</span>
          </div>
          <span className="font-mono font-bold text-sm">${avgTransaction.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * High-fidelity Invoice Component based on the template image.
 */
function PrintableInvoice({ invoiceData }: { invoiceData: any }) {
  const { venue, orders, billingMonth, totalFees, subtotal, tax, totalDue } = invoiceData;
  const todayStr = format(new Date(), 'MM/dd/yyyy');
  const dueDateStr = format(addDays(new Date(), 30), 'MM/dd/yyyy');
  const typeCode = venue.type.includes('Golf') ? 'GC' : (venue.type.includes('Bowling') ? 'BA' : 'BR');
  const accountId = `${typeCode}-${venue.id.slice(0, 4).toUpperCase()}`;
  const invoiceId = `INV-${typeCode}-${getNumericOrderId(venue.id)}`;

  return (
    <div className="bg-white p-12 text-slate-900 font-sans max-w-[850px] mx-auto border shadow-2xl print:shadow-none print:border-0 print:p-0">
      {/* Header */}
      <div className="flex justify-between items-stretch h-32 mb-12">
        <div className="bg-[#213147] flex-1 flex flex-col justify-center px-8 relative">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-white font-bold text-4xl tracking-tighter">KOOP</span>
            <div className="w-2 h-2 bg-red-600 rounded-full" />
            <span className="text-white/60 font-light text-2xl">{venue.type === 'Brewery' || venue.type === 'Restaurant' ? 'Brewery / Restaurant' : venue.type}</span>
          </div>
          <p className="text-white/40 text-xs italic tracking-wider">Mobile Ordering Platform</p>
        </div>
        <div className="bg-red-600 w-64 flex flex-col justify-center px-8 text-white">
          <h1 className="text-4xl font-black uppercase tracking-tight mb-1">INVOICE</h1>
          <p className="text-sm font-bold opacity-80">#{invoiceId}</p>
        </div>
      </div>

      {/* Address Block */}
      <div className="grid grid-cols-3 gap-8 mb-16 text-[11px] leading-relaxed">
        <div>
          <h4 className="font-black uppercase tracking-widest text-red-600 mb-3">FROM</h4>
          <p className="font-bold">Koop Technologies, LLC</p>
          <p>3362 Grantham Ct</p>
          <p>Oakland Twp, MI 48363</p>
          <p className="text-blue-600">billing@kooporders.com</p>
        </div>
        <div>
          <h4 className="font-black uppercase tracking-widest text-red-600 mb-3">BILL TO</h4>
          <p className="font-bold">[{venue.courseName}]</p>
          <p>[{venue.contactName}]</p>
          <p>[{venue.streetAddress}]</p>
          <p>[{venue.city}, {venue.state} {venue.zip}]</p>
        </div>
        <div>
          <h4 className="font-black uppercase tracking-widest text-red-600 mb-3">INVOICE DETAILS</h4>
          <div className="grid grid-cols-2 gap-x-2">
            <span className="font-bold">Invoice #:</span> <span>{invoiceId}</span>
            <span className="font-bold">Invoice Date:</span> <span>{todayStr}</span>
            <span className="font-bold">Due Date:</span> <span>{dueDateStr}</span>
            <span className="font-bold">Billing Period:</span> <span>{billingMonth}</span>
            <span className="font-bold">Account #:</span> <span>{accountId}</span>
          </div>
        </div>
      </div>

      {/* Items Section Header */}
      <div className="bg-[#213147] text-white px-6 py-2.5 font-bold text-xs uppercase tracking-widest mb-4">
        {venue.courseName.toUpperCase()} — MONTHLY PLATFORM SERVICES
      </div>

      {/* Table */}
      <Table className="mb-8">
        <TableHeader className="bg-[#213147]/5">
          <TableRow className="border-b-2 border-[#213147]">
            <TableHead className="text-[#213147] font-black uppercase text-[10px] tracking-wider py-3">DESCRIPTION</TableHead>
            <TableHead className="text-[#213147] font-black uppercase text-[10px] tracking-wider py-3 text-center">QTY</TableHead>
            <TableHead className="text-[#213147] font-black uppercase text-[10px] tracking-wider py-3 text-right">UNIT PRICE</TableHead>
            <TableHead className="text-[#213147] font-black uppercase text-[10px] tracking-wider py-3 text-right">AMOUNT</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-[11px]">
          <TableRow className="border-b border-slate-100">
            <TableCell className="py-4">
              <p className="font-bold">Launch Fee — Menu setup, QR signage,</p>
              <p className="text-slate-500">marketing materials, staff training</p>
            </TableCell>
            <TableCell className="text-center">1</TableCell>
            <TableCell className="text-right">${(venue.launchFee || 0).toFixed(2)}</TableCell>
            <TableCell className="text-right font-bold">${(venue.launchFee || 0).toFixed(2)}</TableCell>
          </TableRow>
          <TableRow className="border-b border-slate-100">
            <TableCell className="py-4">
              <p className="font-bold">Monthly Platform Fee — {venue.type} mobile</p>
              <p className="text-slate-500">ordering</p>
            </TableCell>
            <TableCell className="text-center">1</TableCell>
            <TableCell className="text-right">${(venue.monthlyPlatformFee || 0).toFixed(2)}</TableCell>
            <TableCell className="text-right font-bold">${(venue.monthlyPlatformFee || 0).toFixed(2)}</TableCell>
          </TableRow>
          <TableRow className="border-b border-slate-100">
            <TableCell className="py-4">
              <p className="font-bold">Transaction Fees Collected — {orders.length} orders ×</p>
              <p className="text-slate-500">${(venue.serviceFee || 0).toFixed(2)} fee (patron-paid, remitted monthly)</p>
            </TableCell>
            <TableCell className="text-center">{orders.length}</TableCell>
            <TableCell className="text-right">${(venue.serviceFee || 0).toFixed(2)}</TableCell>
            <TableCell className="text-right font-bold">${totalFees.toFixed(2)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Totals */}
      <div className="flex justify-end mb-16">
        <div className="w-64 space-y-3 text-[11px]">
          <div className="flex justify-between items-center text-slate-500">
            <span>Subtotal</span>
            <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
          </div>
          <Separator className="bg-slate-100" />
          <div className="flex justify-between items-center text-slate-500">
            <span>Transaction Fees</span>
            <span className="font-bold text-slate-900">${totalFees.toFixed(2)}</span>
          </div>
          <Separator className="bg-slate-100" />
          <div className="flex justify-between items-center text-slate-500">
            <span>Tax (if applicable)</span>
            <span className="font-bold text-slate-900">$0.00</span>
          </div>
          <div className="bg-[#213147] text-white px-4 py-3 flex justify-between items-center mt-4">
            <span className="font-black uppercase tracking-widest text-[10px]">TOTAL DUE</span>
            <span className="text-xl font-black">${totalDue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="grid grid-cols-2 gap-8 mb-12">
        <div className="bg-slate-50 p-6 rounded-sm border border-slate-100">
          <h4 className="font-black text-[10px] uppercase tracking-widest mb-3">PAYMENT INSTRUCTIONS</h4>
          <div className="text-[10px] space-y-1.5 leading-relaxed text-slate-600">
            <p>Payment due within 30 days of invoice date.</p>
            <p>ACH/Bank Transfer preferred.</p>
            <p>Make checks payable to: <span className="font-bold text-slate-900">Koop Technologies, LLC</span></p>
            <p>Ref: Invoice # on all payments.</p>
          </div>
        </div>
        <div className="bg-slate-50 p-6 rounded-sm border border-slate-100">
          <h4 className="font-black text-[10px] uppercase tracking-widest mb-3">NOTES</h4>
          <div className="text-[10px] space-y-1.5 leading-relaxed text-slate-600">
            <p>Transaction fees are collected from patrons at time of order and remitted to Koop at month-end.</p>
            <p>Platform processes payments via Authorize.Net to your merchant account.</p>
            <p>Questions? Contact <span className="font-bold text-slate-900">billing@koopnow.com</span></p>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 italic mb-16">
        Thank you for partnering with Koop — driving more revenue to your venue.
      </div>

      {/* Final Bottom Bar */}
      <div className="border-t-2 border-[#213147] pt-4 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span className="text-slate-900">KOOP</span>
          <span>|</span>
          <span>Mobile Ordering Platform</span>
        </div>
        <div className="flex items-center gap-4">
          <span>www.kooporders.com</span>
          <span>|</span>
          <span>billing@kooporders.com</span>
        </div>
        <div>Page 1 of 1</div>
      </div>
    </div>
  );
}

export default function KOOPAdminPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);
  const [activeTab, setActiveTab] = useState<string>('operations');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // Date Range for Reports
  const [reportStartDate, setReportStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Billing State
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [billingMonth, setBillingMonth] = useState(format(subMonths(new Date(), 1), 'yyyy-MM'));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sellersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sellers');
  }, [firestore]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'orders');
  }, [firestore]);

  const prospectsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'prospects');
  }, [firestore]);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'activities');
  }, [firestore]);

  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);
  const { data: orders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);
  const { data: prospects, isLoading: isProspectsLoading } = useCollection<Prospect>(prospectsQuery);
  const { data: activities, isLoading: isActivitiesLoading } = useCollection<SalesActivity>(activitiesQuery);

  const sortedProspects = useMemo(() => {
    if (!prospects) return [];
    return [...prospects].sort((a, b) => {
      const timeA = a.updatedAt?.toMillis?.() || 0;
      const timeB = b.updatedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  }, [prospects]);

  const sortedActivities = useMemo(() => {
    if (!activities) return [];
    return [...activities].sort((a, b) => {
      const timeA = a.date?.toMillis?.() || 0;
      const timeB = b.date?.toMillis?.() || 0;
      return timeB - timeA;
    });
  }, [activities]);

  const salesStats = useMemo(() => {
    if (!orders) return null;

    const calculate = (filtered: Order[]) => {
      const revenue = filtered.reduce((acc, o) => acc + (o.serviceFee || 0), 0);
      const ordersCount = filtered.length;
      const totalSales = filtered.reduce((acc, o) => acc + (o.total || 0), 0);
      const avgTransaction = ordersCount > 0 ? totalSales / ordersCount : 0;
      return { revenue, orders: ordersCount, avgTransaction };
    };

    const dailyOrders = orders.filter(o => o.createdAt && isToday(o.createdAt.toDate()));
    const monthlyOrders = orders.filter(o => o.createdAt && isThisMonth(o.createdAt.toDate()));
    const yearlyOrders = orders.filter(o => o.createdAt && isThisYear(o.createdAt.toDate()));

    return {
      daily: calculate(dailyOrders),
      monthly: calculate(monthlyOrders),
      yearly: calculate(yearlyOrders),
    };
  }, [orders]);

  const reportData = useMemo(() => {
    if (!orders || !sellers) return [];

    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const orderDate = o.createdAt.toDate();
      return orderDate >= start && orderDate <= end;
    });

    return sellers.map(seller => {
      const venueOrders = filteredOrders.filter(o => o.sellerId === seller.id);
      const koopRevenue = venueOrders.reduce((acc, o) => acc + (o.serviceFee || 0), 0);
      const totalVenueSales = venueOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      
      return {
        id: seller.id,
        venueName: seller.courseName,
        type: seller.type,
        orderCount: venueOrders.length,
        grossSales: totalVenueSales,
        koopRevenue: koopRevenue,
        monthlyFee: seller.monthlyPlatformFee || 0,
        launchFee: seller.launchFee || 0,
        email: seller.contactEmail
      };
    });
  }, [orders, sellers, reportStartDate, reportEndDate]);

  const pipelineStats = useMemo(() => {
    if (!prospects) return null;
    const closed = prospects.filter(p => p.stage === 'Closed');
    const pipelineValue = prospects.reduce((acc, p) => acc + (p.launchFeeQuoted || 0), 0);
    const estAnnualVolume = closed.reduce((acc, p) => acc + (p.estVolume || 0) * 12, 0);
    return {
      total: prospects.length,
      closedCount: closed.length,
      pipelineValue,
      estAnnualVolume
    };
  }, [prospects]);

  const form = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      courseName: '',
      type: 'Public Golf Course',
      menuTypes: [],
      halfwayHouseCount: 0,
      halfwayHouseNames: [],
      laneCount: 0,
      tableCount: 0,
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      serviceFee: 0,
      taxRate: 6.0,
      menuServiceFees: {},
      monthlyPlatformFee: 0,
      launchFee: 0,
      status: 'Active',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "halfwayHouseNames" as any,
  });

  const selectedType = form.watch('type');
  const selectedMenuTypes = form.watch('menuTypes') || [];
  const halfwayCount = form.watch('halfwayHouseCount') || 0;

  const isHalfwayHouseEnabled = selectedMenuTypes.includes('Halfway House');

  useEffect(() => {
    if (isHalfwayHouseEnabled) {
      const currentNames = form.getValues('halfwayHouseNames') || [];
      if (halfwayCount > currentNames.length) {
        for (let i = currentNames.length; i < halfwayCount; i++) {
          append(`Halfway House ${i + 1}`);
        }
      } else if (halfwayCount < currentNames.length) {
        for (let i = currentNames.length - 1; i >= halfwayCount; i--) {
          remove(i);
        }
      }
    } else {
      form.setValue('halfwayHouseNames', []);
      form.setValue('halfwayHouseCount', 0);
    }
  }, [halfwayCount, isHalfwayHouseEnabled, append, remove, form]);

  useEffect(() => {
    const validOptions = getMenuOptionsForType(selectedType);
    const currentMenuTypes = form.getValues('menuTypes') || [];
    const filteredMenuTypes = currentMenuTypes.filter(t => validOptions.includes(t));
    
    if (filteredMenuTypes.length !== currentMenuTypes.length) {
      form.setValue('menuTypes', filteredMenuTypes);
    }

    if (!filteredMenuTypes.includes('Lane Delivery')) form.setValue('laneCount', 0);
    if (!filteredMenuTypes.includes('Dine-In')) form.setValue('tableCount', 0);
    
  }, [selectedType, form]);

  const handleOpenForm = (seller: Seller | null = null) => {
    setEditingSeller(seller);
    if (seller) {
      form.reset({
        courseName: seller.courseName,
        type: seller.type,
        menuTypes: seller.menuTypes || [],
        halfwayHouseCount: seller.halfwayHouseCount || 0,
        halfwayHouseNames: seller.halfwayHouseNames || [],
        laneCount: seller.laneCount || 0,
        tableCount: seller.tableCount || 0,
        streetAddress: seller.streetAddress,
        city: seller.city,
        state: seller.state,
        zip: seller.zip,
        contactName: seller.contactName,
        contactEmail: seller.contactEmail,
        contactPhone: seller.contactPhone,
        serviceFee: seller.serviceFee,
        taxRate: seller.taxRate || 6.0,
        menuServiceFees: seller.menuServiceFees || {},
        monthlyPlatformFee: seller.monthlyPlatformFee || 0,
        launchFee: seller.launchFee || 0,
        status: seller.status,
      });
    } else {
      form.reset({
        courseName: '',
        type: 'Public Golf Course',
        menuTypes: [],
        halfwayHouseCount: 0,
        halfwayHouseNames: [],
        laneCount: 0,
        tableCount: 0,
        streetAddress: '',
        city: '',
        state: '',
        zip: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        serviceFee: 0,
        taxRate: 6.0,
        menuServiceFees: {},
        monthlyPlatformFee: 0,
        launchFee: 0,
        status: 'Active',
      });
    }
    setIsFormOpen(true);
  };

  const scrollToSection = (id: string, tab?: string) => {
    if (tab) setActiveTab(tab);
    
    // Give time for tab to switch if necessary
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const offset = 140; // Height of header + navigation
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }, tab ? 50 : 0);
  };

  const handleSystemReset = async () => {
    if (!firestore) return;
    setIsResetting(true);
    
    try {
      const batch = writeBatch(firestore);
      
      const ordersSnapshot = await getDocs(collection(firestore, 'orders'));
      ordersSnapshot.forEach((orderDoc) => {
        batch.delete(orderDoc.ref);
      });
      
      const sellersSnapshot = await getDocs(collection(firestore, 'sellers'));
      sellersSnapshot.forEach((sellerDoc) => {
        batch.update(sellerDoc.ref, { 
          bevcartActive: false,
          clubhouseActive: false,
          lastActive: null 
        });
      });
      
      await batch.commit();
      toast({
        title: "System Reset Complete",
        description: "All orders have been cleared and drivers disconnected.",
      });
    } catch (error) {
      console.error("Reset failed:", error);
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: "An error occurred while resetting the platform state.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleDownloadSalesReport = () => {
    if (reportData.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No data to export.' });
      return;
    }

    const excelData = reportData.map(r => ({
      'Venue Name': r.venueName,
      'Type': r.type,
      'Total Orders': r.orderCount,
      'Gross Sales ($)': r.grossSales.toFixed(2),
      'KOOP Platform Revenue ($)': r.koopRevenue.toFixed(2),
      'Monthly SaaS Fee ($)': r.monthlyFee,
      'Contract Launch Fee ($)': r.launchFee,
      'Contact Email': r.email
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Revenue Summary");
    
    // Auto-size columns
    const maxWidths = Object.keys(excelData[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
    ws['!cols'] = maxWidths;

    XLSX.writeFile(wb, `KOOP_Platform_Revenue_${reportStartDate}_to_${reportEndDate}.xlsx`);
    
    toast({
      title: "Report Generated",
      description: `Sales data exported for ${excelData.length} venues.`
    });
  };

  const handleGenerateInvoice = (seller: Seller) => {
    if (!orders) return;

    const [year, month] = billingMonth.split('-');
    const billingPeriodStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const billingPeriodEnd = endOfMonth(billingPeriodStart);

    const venueOrders = orders.filter(o => {
      if (o.sellerId !== seller.id || !o.createdAt) return false;
      const orderDate = o.createdAt.toDate();
      return orderDate >= billingPeriodStart && orderDate <= billingPeriodEnd;
    });

    const totalFees = venueOrders.reduce((acc, o) => acc + (o.serviceFee || 0), 0);
    const subtotal = (seller.launchFee || 0) + (seller.monthlyPlatformFee || 0) + totalFees;
    
    const invoiceData = {
      venue: seller,
      orders: venueOrders,
      billingMonth: format(billingPeriodStart, 'MMMM yyyy'),
      totalFees,
      subtotal,
      tax: 0,
      totalDue: subtotal
    };

    setSelectedInvoice(invoiceData);
    setIsInvoiceDialogOpen(true);
  };

  const handleGenerateQr = async (seller: Seller) => {
    if (!firestore) return;
    setIsGeneratingQr(true);
    
    const menuUrl = `${window.location.origin}/sellers/${seller.id}/order`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(menuUrl)}`;
    
    const sellerRef = doc(firestore, 'sellers', seller.id);
    updateDoc(sellerRef, { qrCodeUrl: qrApiUrl })
      .then(() => {
        toast({
          title: "QR Code Generated",
          description: `QR code for ${seller.courseName} is now active and stored.`,
        });
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "QR Generation Failed",
          description: "Could not save the QR code URL to the database.",
        });
      })
      .finally(() => {
        setIsGeneratingQr(false);
      });
  };

  const onSave = async (data: SellerFormData) => {
    if (!firestore) return;
    setIsSaving(true);

    let latitude = editingSeller?.latitude || 0;
    let longitude = editingSeller?.longitude || 0;

    const fullAddress = `${data.streetAddress}, ${data.city}, ${data.state} ${data.zip}`;
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const result = await response.json();
      if (result.status === 'OK') {
        const location = result.results[0].geometry.location;
        latitude = location.lat;
        longitude = location.lng;
      } else {
        toast({
          variant: 'destructive',
          title: 'Geocoding Failed',
          description: 'Could not calculate coordinates. Please verify the address.'
        });
        if (!editingSeller) {
          setIsSaving(false);
          return;
        }
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }

    const sellerId = editingSeller ? editingSeller.id : slugify(data.courseName);
    const sellerRef = doc(firestore, 'sellers', sellerId);
    
    const payload = { ...data, id: sellerId, latitude, longitude };

    setDoc(sellerRef, payload, { merge: true })
      .then(() => {
        toast({ 
          title: editingSeller ? 'Seller Updated' : 'Seller Created', 
          description: `${data.courseName} has been saved.` 
        });
        setIsFormOpen(false);
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerRef.path,
          operation: 'write',
          requestResourceData: payload
        }));
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const confirmDelete = () => {
    if (!firestore || !sellerToDelete) return;
    
    const id = sellerToDelete.id;
    const name = sellerToDelete.courseName;
    const sellerRef = doc(firestore, 'sellers', id);
    
    deleteDoc(sellerRef)
      .then(() => {
        toast({ title: 'Seller Deleted', description: `${name} has been removed.` });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerRef.path,
          operation: 'delete'
        }));
      });
    
    setSellerToDelete(null);
  };

  const getStageColor = (stage: ProspectStage) => {
    switch (stage) {
      case 'Contacted': return 'bg-slate-500';
      case 'Demo Scheduled': return 'bg-blue-500';
      case 'Proposal Sent': return 'bg-purple-500';
      case 'Closed': return 'bg-green-600';
      case 'Lost': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!isMounted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <Skeleton className="h-12 w-64" />
          <div className="flex gap-3"><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-40" /></div>
        </header>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-headline text-3xl font-bold text-foreground uppercase tracking-tight text-[#213147]">KOOP ADMIN</h1>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-primary/5 border-primary/20">System Master</Badge>
          </div>
          <p className="text-muted-foreground">Global oversight of seller network and growth pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                <RefreshCw className={cn("mr-2 h-4 w-4", isResetting && "animate-spin")} />
                Hard Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>System Hard Reset</AlertDialogTitle>
                <AlertDialogDescription>Delete all orders and reset driver states.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSystemReset} className="bg-destructive">Confirm Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => handleOpenForm()} className="shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Register Seller
          </Button>
        </div>
      </header>

      {/* Quick Navigation Sticky Bar */}
      <nav className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-y mb-8 -mx-4 px-4 py-3 flex items-center justify-start gap-2 overflow-x-auto shadow-sm scrollbar-hide">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mr-2 shrink-0">Quick Jump:</span>
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('revenue-section', 'operations')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10 whitespace-nowrap">
          <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Revenue
        </Button>
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('reports-section', 'operations')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10 whitespace-nowrap">
          <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Reports
        </Button>
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('billing-section', 'operations')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10 whitespace-nowrap">
          <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Billing
        </Button>
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('rate-matrix-section', 'operations')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10 whitespace-nowrap">
          <Hash className="mr-1.5 h-3.5 w-3.5" /> Rate Matrix
        </Button>
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('sellers-section', 'operations')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10 whitespace-nowrap">
          <Building className="mr-1.5 h-3.5 w-3.5" /> Sellers
        </Button>
        <div className="h-4 w-[1px] bg-border mx-2 shrink-0" />
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('pipeline-stats-section', 'growth')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-indigo-50 text-indigo-600 whitespace-nowrap">
          <Target className="mr-1.5 h-3.5 w-3.5" /> Pipeline
        </Button>
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('activity-section', 'growth')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-indigo-50 text-indigo-600 whitespace-nowrap">
          <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Activity
        </Button>
      </nav>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="operations" className="text-[10px] font-black uppercase tracking-widest px-8">Venue Operations</TabsTrigger>
          <TabsTrigger value="growth" className="text-[10px] font-black uppercase tracking-widest px-8">Growth Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-10">
          <section id="revenue-section" className="scroll-mt-40">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5" /> Platform Revenue
            </h2>
            <div className="flex flex-wrap gap-4 mb-8">
                {isOrdersLoading ? (
                    <>
                        <Skeleton key="rev-skel-1" className="h-40 flex-1 min-w-[280px]" />
                        <Skeleton key="rev-skel-2" className="h-40 flex-1 min-w-[280px]" />
                        <Skeleton key="rev-skel-3" className="h-40 flex-1 min-w-[280px]" />
                    </>
                ) : salesStats ? (
                    <>
                        <GlobalStatCard title="Daily" {...salesStats.daily} />
                        <GlobalStatCard title="Monthly" {...salesStats.monthly} />
                        <GlobalStatCard title="Yearly" {...salesStats.yearly} />
                    </>
                ) : null}
            </div>

            {/* Platform Reports Section */}
            <Card id="reports-section" className="border shadow-md scroll-mt-40">
              <CardHeader className="pb-4 bg-muted/10 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg uppercase font-headline">Revenue Performance Reports</CardTitle>
                      <CardDescription>Analyze sales and fee breakdown by date range.</CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={handleDownloadSalesReport}
                    disabled={isOrdersLoading || isSellersLoading || reportData.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-md uppercase text-[10px] font-black tracking-widest"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export to Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Start Date</Label>
                    <Input 
                      type="date" 
                      value={reportStartDate} 
                      onChange={(e) => setReportStartDate(e.target.value)} 
                      className="h-10 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">End Date</Label>
                    <Input 
                      type="date" 
                      value={reportEndDate} 
                      onChange={(e) => setReportEndDate(e.target.value)} 
                      className="h-10 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden bg-background">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader className="bg-muted/30 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Venue</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Orders</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Gross Sales</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right text-indigo-600">KOOP Fees</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Monthly SaaS</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Launch Fee</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isOrdersLoading || isSellersLoading ? (
                          [...Array(5)].map((_, i) => (
                            <TableRow key={`rep-skel-${i}`}>
                              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : reportData.length > 0 ? (
                          reportData.map((venue) => (
                            <TableRow key={venue.id} className="hover:bg-muted/5 transition-colors">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold truncate max-w-[180px]">{venue.venueName}</span>
                                  <span className="text-[9px] uppercase text-muted-foreground">{venue.type}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-mono font-bold text-xs">{venue.orderCount}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs">${venue.grossSales.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono font-black text-xs text-indigo-600">${venue.koopRevenue.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs text-muted-foreground">${venue.monthlyFee}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs text-muted-foreground">${venue.launchFee}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic text-sm">
                              No sales data found for the selected date range.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Billing & Invoices Section */}
          <section id="billing-section" className="mt-10 scroll-mt-40">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5" /> Monthly Billing & Invoices
            </h2>
            <Card className="border shadow-md">
              <CardHeader className="pb-4 bg-muted/10 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg uppercase font-headline">Generate Monthly Invoices</CardTitle>
                      <CardDescription>Calculate platform SaaS and transaction fees for the selected month.</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="month" 
                      value={billingMonth} 
                      onChange={(e) => setBillingMonth(e.target.value)} 
                      className="w-40 h-10 font-bold"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border rounded-xl overflow-hidden bg-background">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase">Venue</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right">SaaS + Launch</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right">Remitted Transaction Fees</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right">Invoice Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isSellersLoading || isOrdersLoading ? (
                        [...Array(3)].map((_, i) => (
                          <TableRow key={`bill-skel-${i}`}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : sellers && sellers.length > 0 ? (
                        sellers.map((s) => {
                          const [year, month] = billingMonth.split('-');
                          const start = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
                          const end = endOfMonth(start);
                          
                          const venueOrders = orders?.filter(o => {
                            if (o.sellerId !== s.id || !o.createdAt) return false;
                            const d = o.createdAt.toDate();
                            return d >= start && d <= end;
                          }) || [];

                          const totalTransactionFees = venueOrders.reduce((acc, o) => acc + (o.serviceFee || 0), 0);
                          const contractFees = (s.monthlyPlatformFee || 0) + (s.launchFee || 0);

                          return (
                            <TableRow key={`bill-${s.id}`} className="hover:bg-muted/5 transition-colors">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">{s.courseName}</span>
                                  <span className="text-[9px] uppercase text-muted-foreground">{s.type}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs">${contractFees.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs text-indigo-600">${totalTransactionFees.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => handleGenerateInvoice(s)}>
                                  <Printer className="h-3.5 w-3.5" /> View/Print Invoice
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic text-sm">
                            No sellers available for billing.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Rate Matrix Section */}
          <section id="rate-matrix-section" className="mt-10 scroll-mt-40">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <Hash className="h-3.5 w-3.5" /> Platform Rate Matrix
            </h2>
            <Card className="border shadow-md">
              <CardHeader className="pb-4 bg-muted/10 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Hash className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg uppercase font-headline">Venue Rate Matrix</CardTitle>
                    <CardDescription>Setup fees, monthly SaaS, and per-menu convenience rates.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border rounded-xl overflow-hidden bg-background">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader className="bg-muted/30 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Venue</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Setup Fee</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Monthly SaaS</TableHead>
                          <TableHead className="text-[10px] font-black uppercase pl-8">Service Mode & Convenience Fees</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isSellersLoading ? (
                          [...Array(5)].map((_, i) => (
                            <TableRow key={`rate-skel-${i}`}>
                              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                              <TableCell className="pl-8"><Skeleton className="h-4 w-48" /></TableCell>
                            </TableRow>
                          ))
                        ) : sellers && sellers.length > 0 ? (
                          sellers.map((s) => (
                            <TableRow key={`rate-${s.id}`} className="hover:bg-muted/5 transition-colors">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold truncate max-w-[180px]">{s.courseName}</span>
                                  <span className="text-[9px] uppercase text-muted-foreground">{s.type}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs">${s.launchFee || 0}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs">${s.monthlyPlatformFee || 0}</TableCell>
                              <TableCell className="pl-8">
                                <div className="flex flex-wrap gap-1.5 py-1">
                                  {s.menuTypes?.map(m => {
                                    const fee = s.menuServiceFees?.[m] ?? s.serviceFee;
                                    return (
                                      <Badge key={m} variant="outline" className="h-6 bg-muted/20 border-primary/10 text-[9px] font-bold px-2 py-0 gap-2 items-center flex">
                                        <span className="opacity-60 uppercase">{m}:</span>
                                        <span className="text-primary font-black">${(fee || 0).toFixed(2)}</span>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic text-sm">
                              No sellers registered to display rate matrix.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card id="sellers-section" className="shadow-sm border-muted mt-10 scroll-mt-40">
            <CardHeader className="bg-muted/30 border-b py-4">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">Registered Sellers</CardTitle>
                <Badge variant="outline" className="bg-background">{sellers?.length || 0} Total</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isSellersLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Loading sellers...</p>
                </div>
              ) : sellers && sellers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead>Seller</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-center">QR Support</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellers.map((seller) => (
                        <TableRow key={seller.id} className="hover:bg-muted/5">
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                                <span>{seller.courseName}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">Fee: ${(seller.serviceFee || 0).toFixed(2)} | Tax: {seller.taxRate || 6.0}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold">{seller.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span className="font-semibold">{seller.contactName}</span>
                              <span className="text-muted-foreground">{seller.contactEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2 items-center">
                              {seller.qrCodeUrl ? (
                                <Badge className="bg-green-600 text-white gap-1 uppercase text-[8px] font-black">
                                  <QrCode className="h-2.5 w-2.5" /> Stored
                                </Badge>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  disabled={isGeneratingQr}
                                  onClick={() => handleGenerateQr(seller)}
                                  className="h-7 text-[8px] font-black uppercase tracking-widest gap-1 border-primary/20 text-primary hover:bg-primary/5"
                                >
                                  {isGeneratingQr ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <QrCode className="h-2.5 w-2.5" />}
                                  Generate QR
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={seller.status === 'Active' ? 'default' : 'secondary'} className="w-16 justify-center">
                              {seller.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" asChild className="h-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-[10px] font-bold uppercase">
                                <Link href={`/sellers/${seller.id}`}>Manage</Link>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenForm(seller)} title="Edit"><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setSellerToDelete(seller)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed m-6 rounded-xl">
                  <Building className="h-12 w-12 opacity-10 mx-auto mb-2" />
                  <p>No sellers registered.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="space-y-10">
          <section id="pipeline-stats-section" className="scroll-mt-40">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <Target className="h-3.5 w-3.5" /> Pipeline Analytics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm border-2 border-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl"><Target className="h-6 w-6 text-primary" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Deals</p>
                      <p className="text-2xl font-headline font-black">{pipelineStats?.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-2 border-green-100">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl"><Briefcase className="h-6 w-6 text-green-600" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Venues Closed</p>
                      <p className="text-2xl font-headline font-black text-green-600">{pipelineStats?.closedCount || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-2 border-indigo-100">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-xl"><DollarSign className="h-6 w-6 text-indigo-600" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Contract Value</p>
                      <p className="text-2xl font-headline font-black text-indigo-600">${pipelineStats?.pipelineValue.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-2 border-blue-100">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl"><TrendingUp className="h-6 w-6 text-blue-600" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Est. Managed Vol.</p>
                      <p className="text-2xl font-headline font-black text-blue-600">${pipelineStats?.estAnnualVolume.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 shadow-sm border-muted overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg">Global Pipeline</CardTitle>
                <CardDescription>Consolidated view of all sales representative activity.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isProspectsLoading ? (
                  <div className="p-10 space-y-4">
                    <Skeleton key="p-skel-1" className="h-10 w-full" />
                    <Skeleton key="p-skel-2" className="h-10 w-full" />
                    <Skeleton key="p-skel-3" className="h-10 w-full" />
                  </div>
                ) : sortedProspects && sortedProspects.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="text-[10px] uppercase font-black">Venue</TableHead>
                        <TableHead className="text-[10px] uppercase font-black">Stage</TableHead>
                        <TableHead className="text-[10px] uppercase font-black">Rep</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-black">Quote</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedProspects.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">{p.venueName}</span>
                              <span className="text-[9px] text-muted-foreground uppercase">{p.venueType}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-[8px] font-black uppercase", getStageColor(p.stage))}>{p.stage}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{p.assignedRepName}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs">${p.launchFeeQuoted.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-20 text-muted-foreground bg-white"><p>No prospects found in the pipeline.</p></div>
                )}
              </CardContent>
            </Card>

            <Card id="activity-section" className="shadow-sm border-muted flex flex-col max-h-[600px] overflow-hidden scroll-mt-40">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {isActivitiesLoading ? (
                      [...Array(3)].map((_, i) => <Skeleton key={`act-skel-${i}`} className="h-20 w-full" />)
                    ) : sortedActivities && sortedActivities.length > 0 ? (
                      sortedActivities.map((a) => (
                        <div key={a.id} className="p-3 border rounded-lg bg-background text-xs space-y-1 shadow-sm">
                          <div className="flex justify-between items-start">
                            <span className="font-bold uppercase tracking-tight">{a.venueName}</span>
                            <span className="text-[9px] font-mono text-muted-foreground">{a.date ? format(a.date.toDate(), 'MMM d') : ''}</span>
                          </div>
                          <p className="text-muted-foreground italic">"{a.notes}"</p>
                          <div className="flex items-center gap-2 pt-1 border-t mt-1">
                            <Badge variant="secondary" className="text-[8px] h-4">{a.type}</Badge>
                            <span className="text-[9px] font-black uppercase text-indigo-600">{a.repName}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-sm italic py-10">No recent activity logged.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invoice Generator Modal */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="uppercase font-headline tracking-tight">Invoice Preview</DialogTitle>
              <DialogDescription>Review and print monthly billing for {selectedInvoice?.venue.courseName}.</DialogDescription>
            </div>
            <Button onClick={() => window.print()} className="h-10 px-6 font-black uppercase tracking-widest gap-2">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          </DialogHeader>
          <div className="p-8 bg-slate-100/50 print:p-0 print:bg-white">
            {selectedInvoice && <PrintableInvoice invoiceData={selectedInvoice} />}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button variant="ghost" onClick={() => setIsInvoiceDialogOpen(false)} className="font-bold uppercase text-[10px]">Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-primary uppercase">
              {editingSeller ? 'Edit Seller Profile' : 'Register New Seller'}
            </DialogTitle>
            <DialogDescription>Ensure all details are accurate. Coordinates calculated via address.</DialogDescription>
          </DialogHeader>
          <Separator className="my-2" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-8 py-4">
              {/* SECTION 0: QR ASSETS (Only for existing sellers with QR) */}
              {editingSeller && editingSeller.qrCodeUrl && (
                <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/10 flex flex-col items-center gap-4 text-center">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center justify-center gap-2">
                      <QrCode className="h-4 w-4" /> Live QR Asset
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Pointed to live digital menu</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl shadow-inner border">
                    <Image 
                      src={editingSeller.qrCodeUrl} 
                      alt="Seller QR" 
                      width={160} 
                      height={160} 
                      className="mx-auto"
                    />
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-6 font-black uppercase text-[10px] tracking-widest gap-2 bg-white"
                    asChild
                  >
                    <a href={editingSeller.qrCodeUrl} download={`${editingSeller.courseName}_QR.png`} target="_blank">
                      <Download className="h-3.5 w-3.5" /> Download PNG
                    </a>
                  </Button>
                </div>
              )}

              {/* SECTION 1: BASIC INFO */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2"><Building className="h-4 w-4" /> Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="courseName" render={({ field }) => (
                    <FormItem><FormLabel>Seller / Business Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-row space-x-6 pt-2">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="Active" id="active" /><Label htmlFor="active" className="font-normal">Active</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="Inactive" id="inactive" /><Label htmlFor="inactive" className="font-normal">Inactive</Label></div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seller Type</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {sellerTypes.map((type) => (
                          <div key={type} className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value={type} id={type} /><Label htmlFor={type} className="font-normal cursor-pointer flex-1">{type}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="menuTypes" render={() => (
                  <FormItem>
                    <FormLabel>Enabled Menu Types</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {getMenuOptionsForType(selectedType).map((option) => (
                        <FormField key={option} control={form.control} name="menuTypes" render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 border rounded-md p-2 hover:bg-muted/50 transition-colors">
                            <FormControl><Checkbox checked={field.value?.includes(option)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, option]) : field.onChange(field.value?.filter((value) => value !== option))} /></FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer flex-1">{option}</FormLabel>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  </FormItem>
                )} />
              </div>

              {/* SECTION 2: DYNAMIC VENUE CONFIG */}
              {(selectedType === 'Bowling Alley' || selectedType === 'Restaurant' || isHalfwayHouseEnabled) && (
                <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-dashed">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2"><Settings2 className="h-4 w-4" /> Service Configuration</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedType === 'Bowling Alley' && (
                      <FormField control={form.control} name="laneCount" render={({ field }) => (
                        <FormItem><FormLabel>Total Lanes</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Maximum lane number for selection.</FormDescription></FormItem>
                      )} />
                    )}
                    {selectedType === 'Restaurant' && (
                      <FormField control={form.control} name="tableCount" render={({ field }) => (
                        <FormItem><FormLabel>Total Tables</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Maximum table number for Dine-In.</FormDescription></FormItem>
                      )} />
                    )}
                    {isHalfwayHouseEnabled && (
                      <FormField control={form.control} name="halfwayHouseCount" render={({ field }) => (
                        <FormItem><FormLabel>Halfway House Count</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormDescription>How many halfway houses on course?</FormDescription></FormItem>
                      )} />
                    )}
                  </div>
                  {isHalfwayHouseEnabled && halfwayCount > 0 && (
                    <div className="space-y-2 mt-4">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Halfway House Names</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {fields.map((field, index) => (
                          <FormField key={field.id} control={form.control} name={`halfwayHouseNames.${index}`} render={({ field }) => (
                            <FormItem><FormControl><Input {...field} value={field.value ?? ''} placeholder={`Hole ${index + 9} Snack Shack`} /></FormControl></FormItem>
                          )} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: ADDRESS */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2"><MapIcon className="h-4 w-4" /> Physical Location</h3>
                <FormField control={form.control} name="streetAddress" render={({ field }) => (
                  <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} placeholder="123 Fairway Dr" /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} placeholder="CA" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="zip" render={({ field }) => (
                    <FormItem><FormLabel>ZIP Code</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
              </div>

              {/* SECTION 4: FINANCIALS */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <DollarSign className="h-5 w-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Financial Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-2xl border-2 border-dashed">
                  <FormField control={form.control} name="serviceFee" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase flex items-center gap-2">
                        <DollarSign className="h-3 w-3" /> Default Conv. Fee
                      </FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                      <FormDescription className="text-[10px]">Standard fee per order.</FormDescription>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="taxRate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase flex items-center gap-2">
                        <Percent className="h-3 w-3" /> Sales Tax Rate
                      </FormLabel>
                      <FormControl><div className="relative"><Input type="number" step="0.1" {...field} value={field.value ?? ''} className="pr-8" /><Percent className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /></div></FormControl>
                      <FormDescription className="text-[10px]">Calculated at checkout.</FormDescription>
                    </FormItem>
                  )} />
                </div>

                {/* SaaS & Launch Fees */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                  <FormField control={form.control} name="launchFee" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-indigo-600" /> Setup / Launch Fee ($)
                      </FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                      <FormDescription className="text-[10px]">One-time implementation fee.</FormDescription>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="monthlyPlatformFee" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase flex items-center gap-2">
                        <CalendarDays className="h-3 w-3 text-indigo-600" /> Monthly SaaS Fee ($)
                      </FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                      <FormDescription className="text-[10px]">Recurring platform usage fee.</FormDescription>
                    </FormItem>
                  )} />
                </div>

                {/* Menu-Specific Overrides */}
                {selectedMenuTypes.length > 0 && (
                  <div className="pt-4 border-t space-y-4">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Menu-Specific Convenience Overrides</Label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedMenuTypes.map((menuType) => (
                        <FormField
                          key={`override-${menuType}`}
                          control={form.control}
                          name={`menuServiceFees.${menuType}`}
                          render={({ field }) => (
                            <div className="p-3 bg-background border-2 rounded-xl shadow-sm space-y-2">
                              <p className="text-[10px] font-bold uppercase truncate">{menuType}</p>
                              <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} placeholder="Uses Default" className="h-8 text-xs" /></FormControl>
                            </div>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: CONTACT */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2"><User className="h-4 w-4" /> Primary Contact</h3>
                <FormField control={form.control} name="contactName" render={({ field }) => (
                  <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactEmail" render={({ field }) => (
                    <FormItem><FormLabel>Email Address</FormLabel><FormControl><div className="relative"><Input type="email" {...field} className="pl-10" /><Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /></div></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="contactPhone" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><div className="relative"><Input {...field} className="pl-10" /><Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /></div></FormControl></FormItem>
                  )} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="min-w-[140px]">
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editingSeller ? 'Save Changes' : 'Register Seller'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!sellerToDelete} onOpenChange={(open) => !open && setSellerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>Remove <strong>{sellerToDelete?.courseName}</strong>? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white">Delete Forever</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
