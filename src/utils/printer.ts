import { invoke } from '@tauri-apps/api/core';

type PrinterConnectionType = 'USB' | 'SERIAL' | 'NETWORK';

interface PrinterConfig {
    connection_type: PrinterConnectionType;
    port?: string;
    baud_rate?: number;
    ip_address?: string;
    [key: string]: unknown;
}

interface PrintData {
    lines: string[];
    config?: PrinterConfig;
}

interface InvoicePrintData {
    invoice_number: string;
    customer_name?: string;
    items: unknown[];
    total: number;
    config?: PrinterConfig;
}

interface ContractPrintData {
    contract_code: string;
    farmer_name: string;
    items: unknown[];
    start_date: string;
    end_date: string;
    total_value: number;
    config?: PrinterConfig;
}

/**
 * Print a custom receipt with raw text
 */
export async function printReceipt(data: PrintData): Promise<string> {
    try {
        const result = await invoke<string>('print_receipt', { data });
        return result;
    } catch (error) {
        throw new Error(`Print failed: ${error}`);
    }
}

/**
 * Print a formatted invoice
 */
export async function printInvoice(data: InvoicePrintData): Promise<string> {
    try {
        const result = await invoke<string>('print_invoice', {
            invoiceNumber: data.invoice_number,
            customerName: data.customer_name,
            items: data.items,
            total: data.total,
            config: data.config,
        });
        return result;
    } catch (error) {
        throw new Error(`Invoice print failed: ${error}`);
    }
}

/**
 * Print a storage contract
 */
export async function printContract(data: ContractPrintData): Promise<string> {
    try {
        const result = await invoke<string>('print_contract', {
            contractCode: data.contract_code,
            farmerName: data.farmer_name,
            items: data.items,
            startDate: data.start_date,
            endDate: data.end_date,
            totalValue: data.total_value,
            config: data.config,
        });
        return result;
    } catch (error) {
        throw new Error(`Contract print failed: ${error}`);
    }
}

/**
 * List available serial/USB ports
 */
export async function listSerialPorts(): Promise<string[]> {
    try {
        const ports = await invoke<string[]>('list_serial_ports');
        return ports;
    } catch (error) {
        throw new Error(`Failed to list serial ports: ${error}`);
    }
}

/**
 * Test printer connection
 */
export async function testPrinterConnection(config: PrinterConfig): Promise<string> {
    try {
        const result = await invoke<string>('test_printer_connection', { config });
        return result;
    } catch (error) {
        throw new Error(`Connection test failed: ${error}`);
    }
}

/**
 * Open cash drawer (if connected to printer)
 */
export async function openCashDrawer(config: PrinterConfig): Promise<string> {
    try {
        const result = await invoke<string>('open_cash_drawer', { config });
        return result;
    } catch (error) {
        throw new Error(`Failed to open cash drawer: ${error}`);
    }
}

/**
 * Save printer configuration to localStorage
 */
export function savePrinterConfig(config: PrinterConfig): void {
    localStorage.setItem('coldstore_printer_config', JSON.stringify(config));
}

/**
 * Load printer configuration from localStorage
 */
export function loadPrinterConfig(): PrinterConfig | null {
    const stored = localStorage.getItem('coldstore_printer_config');
    if (stored) {
        try {
            return JSON.parse(stored) as PrinterConfig;
        } catch {
            return null;
        }
    }
    return null;
}

/**
 * Get printer configuration or return default
 */
export function getPrinterConfig(): PrinterConfig {
    const stored = loadPrinterConfig();
    if (stored) {
        return stored;
    }

    // Default USB configuration
    return {
        connection_type: 'USB',
        port: 'COM1',
        baudrate: 9600,
    };
}
