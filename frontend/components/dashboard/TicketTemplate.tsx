"use client";

import { ShopType } from "@/lib/dashboard-config";
import { QRCode } from "./QRCode";
import { cn } from "@/lib/utils";
import React from "react";

interface TicketTemplateProps {
  companyName: string;
  shopType?: ShopType;
  ticketNumber: string;
  date: string;
  items: Array<{ name: string; qty: number; price: number; total: number }>;
  total: number;
  logoUrl?: string;
  attributes?: any; // table_number, patient_name, cashier_name, payment_method, address, phone, tax_rate, cash_received, etc.
}

// ── Helper: formats a number with dot leaders ──
const fmtCFA = (n: number) => n.toLocaleString("fr-FR");

// ── Dotted leader line (Carrefour-style) ──
const DottedLine = ({
  left,
  right,
  bold = false,
}: {
  left: string;
  right: string;
  bold?: boolean;
}) => (
  <div
    className={cn(
      "flex items-baseline gap-0.5 text-[8px]",
      bold && "font-bold",
    )}
  >
    <span className="shrink-0 uppercase">{left}</span>
    <span
      className="flex-1 border-b border-dotted border-black/25 mx-0.5"
      style={{ minWidth: "8px" }}
    />
    <span className="shrink-0 text-right">{right}</span>
  </div>
);

export const TicketTemplate = React.forwardRef<
  HTMLDivElement,
  TicketTemplateProps
>(
  (
    {
      companyName,
      shopType = "boutique",
      ticketNumber,
      date,
      items,
      total,
      logoUrl,
      attributes,
    },
    ref,
  ) => {
    const receiptTitle =
      shopType === "restaurant"
        ? "NOTE DE TABLE"
        : shopType === "pharmacie"
          ? "TICKET OFFICINAL"
          : "REÇU DE CAISSE";

    const itemCount = items.reduce((a, i) => a + i.qty, 0);
    const taxRate = attributes?.tax_rate ?? 0;
    const taxAmount =
      taxRate > 0 ? Math.round(total * (taxRate / (100 + taxRate))) : 0;
    const htAmount = total - taxAmount;

    return (
      <div
        ref={ref}
        className="w-[72mm] bg-white text-black font-mono leading-tight print:m-0"
        style={{
          color: "black",
          backgroundColor: "white",
          padding: "10px 8px",
        }}
      >
        {/* ════════════════ HEADER ════════════════ */}
        <div className="text-center" style={{ marginBottom: "6px" }}>
          {/* Logo or Initial fallback */}
          <div 
            style={{ 
              width: "40px", 
              height: "40px", 
              margin: "0 auto 8px", 
              backgroundColor: "black", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: "white", fontWeight: 900, fontSize: "18px" }}>
                {companyName?.[0] || "G"}
              </span>
            )}
          </div>

          {/* Company Name — Large & Bold */}
          <h1
            className="font-black uppercase tracking-wider"
            style={{
              fontSize: "14px",
              letterSpacing: "0.12em",
              lineHeight: 1.1,
            }}
          >
            {companyName}
          </h1>

          {/* Sub-info: address & phone if provided */}
          {(attributes?.address || attributes?.phone) && (
            <div
              style={{
                fontSize: "7px",
                marginTop: "2px",
                lineHeight: 1.3,
                opacity: 0.7,
              }}
            >
              {attributes.address && <div>{attributes.address}</div>}
              {attributes.phone && <div>Tél : {attributes.phone}</div>}
            </div>
          )}

          {/* Decorative separator */}
          <div
            style={{
              margin: "5px 0 4px",
              borderTop: "1.5px solid black",
              borderBottom: "1.5px solid black",
              padding: "2px 0",
            }}
          >
            <span
              className="font-black uppercase"
              style={{ fontSize: "8px", letterSpacing: "0.25em" }}
            >
              ★ {receiptTitle} ★
            </span>
          </div>
        </div>

        {/* ════════════════ INFO SECTION ════════════════ */}
        <div
          style={{
            fontSize: "8px",
            borderBottom: "1px dashed black",
            paddingBottom: "4px",
            marginBottom: "4px",
          }}
        >
          <DottedLine left="N° Ticket" right={ticketNumber} bold />
          <DottedLine left="Date" right={date} />
          {attributes?.cashier_name && (
            <DottedLine
              left={shopType === "restaurant" ? "Serveur" : "Caissier(ère)"}
              right={attributes.cashier_name}
            />
          )}

          {/* RESTAURANT: Table badge */}
          {shopType === "restaurant" && attributes?.table_number && (
            <div
              style={{
                marginTop: "3px",
                padding: "2px 6px",
                backgroundColor: "black",
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 900,
                fontSize: "9px",
                letterSpacing: "0.1em",
              }}
            >
              <span>TABLE</span>
              <span>{attributes.table_number}</span>
            </div>
          )}

          {/* PHARMACIE: disclaimer */}
          {shopType === "pharmacie" && (
            <div
              style={{
                marginTop: "3px",
                fontSize: "6.5px",
                fontStyle: "italic",
                opacity: 0.7,
                lineHeight: 1.2,
              }}
            >
              Ce ticket ne constitue pas une ordonnance médicale.
            </div>
          )}
        </div>

        {/* ════════════════ ITEMS TABLE ════════════════ */}
        <div style={{ marginBottom: "5px" }}>
          {/* Column Header */}
          <div
            className="font-black uppercase"
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "7px",
              borderBottom: "1px solid black",
              paddingBottom: "2px",
              marginBottom: "3px",
              letterSpacing: "0.05em",
            }}
          >
            <span style={{ width: "48%" }}>Désignation</span>
            <span style={{ width: "12%", textAlign: "center" }}>Qté</span>
            <span style={{ width: "18%", textAlign: "right" }}>P.U</span>
            <span style={{ width: "22%", textAlign: "right" }}>Total</span>
          </div>

          {/* Items */}
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                fontSize: "8px",
                padding: "1.5px 0",
                borderBottom:
                  i < items.length - 1
                    ? "0.5px dotted rgba(0,0,0,0.15)"
                    : "none",
              }}
            >
              <span
                style={{
                  width: "48%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textTransform: "uppercase",
                }}
              >
                {item.name}
              </span>
              <span
                style={{ width: "12%", textAlign: "center", fontWeight: 700 }}
              >
                {item.qty}
              </span>
              <span style={{ width: "18%", textAlign: "right", opacity: 0.6 }}>
                {fmtCFA(item.price || 0)}
              </span>
              <span
                style={{ width: "22%", textAlign: "right", fontWeight: 700 }}
              >
                {fmtCFA(item.total || 0)}
              </span>
            </div>
          ))}

          {/* Item count */}
          <div
            style={{
              fontSize: "7px",
              textAlign: "right",
              opacity: 0.5,
              marginTop: "2px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {itemCount} article{itemCount > 1 ? "s" : ""}
          </div>
        </div>

        {/* ════════════════ TOTALS ════════════════ */}
        <div
          style={{
            borderTop: "2px solid black",
            borderBottom: "2px solid black",
            padding: "4px 0",
            marginBottom: "4px",
          }}
        >
          {/* Sub-total HT if tax applies */}
          {taxRate > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "8px",
                  opacity: 0.7,
                }}
              >
                <span>Montant H.T.</span>
                <span>{fmtCFA(htAmount)} CFA</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "8px",
                  opacity: 0.7,
                }}
              >
                <span>TVA ({taxRate}%)</span>
                <span>{fmtCFA(taxAmount)} CFA</span>
              </div>

              {/* Separator line before TTC */}
              <div style={{ borderTop: "1px dashed black", margin: "2px 0" }} />
            </>
          )}

          {/* Grand Total */}
          <div
            className="font-black"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontSize: "13px",
            }}
          >
            <span style={{ fontSize: "9px", letterSpacing: "0.15em" }}>
              TOTAL {taxRate > 0 ? "TTC" : ""}
            </span>
            <span>{fmtCFA(total || 0)} CFA</span>
          </div>
        </div>

        {/* ════════════════ PAYMENT METHOD ════════════════ */}
        {attributes?.payment_method && (
          <div
            style={{
              fontSize: "8px",
              borderBottom: "1px dashed rgba(0,0,0,0.3)",
              paddingBottom: "4px",
              marginBottom: "4px",
            }}
          >
            <div
              className="font-black uppercase"
              style={{
                fontSize: "7px",
                letterSpacing: "0.1em",
                opacity: 0.5,
                marginBottom: "1px",
              }}
            >
              Mode de Paiement
            </div>
            <div
              className="font-bold uppercase"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "9px",
              }}
            >
              <span>
                {attributes.payment_method === "cash"
                  ? "Espèces"
                  : attributes.payment_method === "card"
                    ? "Carte Bancaire"
                    : attributes.payment_method === "mobile"
                      ? "Mobile Money"
                      : attributes.payment_method}
              </span>
              <span>{fmtCFA(total || 0)} CFA</span>
            </div>

            {/* Show received amount + change for any payment when cash_received is present */}
            {attributes.cash_received != null &&
              attributes.cash_received > 0 && (
                <div
                  style={{
                    marginTop: "4px",
                    padding: "3px 4px",
                    border: "1px solid rgba(0,0,0,0.15)",
                    fontSize: "7.5px",
                  }}
                >
                  <DottedLine
                    left="Montant donné"
                    right={`${fmtCFA(attributes.cash_received)} CFA`}
                  />
                  <div
                    style={{
                      borderTop: "1px dashed rgba(0,0,0,0.15)",
                      margin: "2px 0",
                    }}
                  />
                  <DottedLine
                    left="Monnaie à rendre"
                    right={`${fmtCFA(Math.max(0, attributes.cash_received - total))} CFA`}
                    bold
                  />
                </div>
              )}
          </div>
        )}

        {/* ════════════════ TAX DETAIL BOX ════════════════ */}
        {taxRate > 0 && (
          <div
            style={{
              border: "1px solid black",
              marginBottom: "5px",
              fontSize: "7px",
            }}
          >
            <div
              style={{
                display: "flex",
                backgroundColor: "black",
                color: "white",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: "6.5px",
              }}
            >
              <span
                style={{
                  flex: 1,
                  padding: "2px 4px",
                  borderRight: "1px solid white",
                }}
              >
                Taux TVA
              </span>
              <span
                style={{
                  flex: 1,
                  padding: "2px 4px",
                  borderRight: "1px solid white",
                  textAlign: "right",
                }}
              >
                Montant H.T
              </span>
              <span style={{ flex: 1, padding: "2px 4px", textAlign: "right" }}>
                T.V.A
              </span>
            </div>
            <div style={{ display: "flex", fontWeight: 700 }}>
              <span
                style={{
                  flex: 1,
                  padding: "2px 4px",
                  borderRight: "1px solid rgba(0,0,0,0.2)",
                }}
              >
                {taxRate}%
              </span>
              <span
                style={{
                  flex: 1,
                  padding: "2px 4px",
                  borderRight: "1px solid rgba(0,0,0,0.2)",
                  textAlign: "right",
                }}
              >
                {fmtCFA(htAmount)}
              </span>
              <span style={{ flex: 1, padding: "2px 4px", textAlign: "right" }}>
                {fmtCFA(taxAmount)}
              </span>
            </div>
          </div>
        )}

        {/* ════════════════ FOOTER ════════════════ */}
        <div
          className="text-center"
          style={{
            borderTop: "1.5px solid black",
            paddingTop: "5px",
            marginTop: "2px",
          }}
        >
          {/* Thank you message */}
          <div
            className="font-black uppercase"
            style={{
              fontSize: "8px",
              letterSpacing: "0.15em",
              marginBottom: "3px",
            }}
          >
            Merci de votre confiance !
          </div>

          {/* Shop-specific footer messages */}
          {shopType === "restaurant" && (
            <div style={{ fontSize: "7px", opacity: 0.6, marginBottom: "2px" }}>
              Service non compris — Prix TTC
            </div>
          )}
          {shopType === "pharmacie" && (
            <div
              style={{
                fontSize: "6px",
                opacity: 0.6,
                lineHeight: 1.2,
                marginBottom: "2px",
              }}
            >
              Prenez vos médicaments selon la prescription médicale.
              <br />
              Conservez ce reçu pour vos remboursements.
            </div>
          )}

          {/* Ticket reference bar */}
          <div
            style={{
              fontSize: "7px",
              opacity: 0.5,
              padding: "3px 0",
              borderTop: "1px dashed rgba(0,0,0,0.2)",
              borderBottom: "1px dashed rgba(0,0,0,0.2)",
              margin: "3px 0",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            Ticket {ticketNumber} · {date}
          </div>

          {/* Powered by */}
          <div style={{ opacity: 0.25, marginTop: "4px" }}>
            <div
              className="font-bold tracking-widest uppercase"
              style={{ fontSize: "5px", letterSpacing: "0.3em" }}
            >
              {companyName}
            </div>
            <div style={{ fontSize: "4px" }}>Powered by GAS</div>
          </div>
        </div>

        {/* ════════════════ QR CODE ════════════════ */}
        <div
          className="text-center"
          style={{
            borderTop: "1px dashed rgba(0,0,0,0.2)",
            borderBottom: "1px dashed rgba(0,0,0,0.2)",
            padding: "10px 0 8px",
            marginBottom: "4px",
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <QRCode
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/ticket/${ticketNumber.replace("#", "")}`}
              size={110}
            />
            <div
              style={{
                fontSize: "7px",
                fontWeight: 900,
                letterSpacing: "0.2em",
                opacity: 0.6,
                textTransform: "uppercase",
              }}
            >
              Scanner pour e-ticket
            </div>
            <div
              style={{
                fontSize: "6px",
                fontWeight: 500,
                opacity: 0.3,
              }}
            >
              {ticketNumber}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

TicketTemplate.displayName = "TicketTemplate";
