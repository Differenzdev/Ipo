"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  addGmpSnapshot,
  addPeer,
  addSubscription,
  removePeer,
  updateIpoScraperUrls,
  upsertCompany,
  upsertFundamentals,
  upsertIpo,
} from "@/lib/db/queries";

const numOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : Number(s);
};
const strOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

const ipoSchema = z.object({
  name: z.string().min(1),
  sector: z.string().nullable(),
  priceBandLow: z.number().nullable(),
  priceBandHigh: z.number().nullable(),
  lotSize: z.number().nullable(),
  issueSizeCrores: z.number().nullable(),
  openDate: z.string().nullable(),
  closeDate: z.string().nullable(),
  listingDate: z.string().nullable(),
  status: z.enum(["upcoming", "open", "closed", "listed"]),
});

export async function saveIpo(formData: FormData): Promise<void> {
  const parsed = ipoSchema.parse({
    name: String(formData.get("name") ?? ""),
    sector: strOrNull(formData.get("sector")),
    priceBandLow: numOrNull(formData.get("priceBandLow")),
    priceBandHigh: numOrNull(formData.get("priceBandHigh")),
    lotSize: numOrNull(formData.get("lotSize")),
    issueSizeCrores: numOrNull(formData.get("issueSizeCrores")),
    openDate: strOrNull(formData.get("openDate")),
    closeDate: strOrNull(formData.get("closeDate")),
    listingDate: strOrNull(formData.get("listingDate")),
    status: String(formData.get("status") ?? "upcoming") as "upcoming" | "open" | "closed" | "listed",
  });

  const company = await upsertCompany({ name: parsed.name, sector: parsed.sector });
  await upsertIpo({
    companyId: company.id,
    priceBandLow: parsed.priceBandLow,
    priceBandHigh: parsed.priceBandHigh,
    lotSize: parsed.lotSize,
    issueSizeCrores: parsed.issueSizeCrores,
    openDate: parsed.openDate,
    closeDate: parsed.closeDate,
    listingDate: parsed.listingDate,
    status: parsed.status,
  });

  revalidatePath("/ipos");
  revalidatePath("/admin");
  redirect(`/admin/${company.slug}`);
}

export async function saveFundamentals(companyId: number, formData: FormData): Promise<void> {
  await upsertFundamentals({
    companyId,
    fiscalYear: String(formData.get("fiscalYear") ?? ""),
    revenueCrores: numOrNull(formData.get("revenueCrores")),
    profitCrores: numOrNull(formData.get("profitCrores")),
    marginPct: numOrNull(formData.get("marginPct")),
    debtCrores: numOrNull(formData.get("debtCrores")),
  });
  revalidatePath("/ipos");
  revalidatePath("/admin");
}

export async function saveSubscription(ipoId: number, formData: FormData): Promise<void> {
  const times = numOrNull(formData.get("timesSubscribed"));
  if (times === null) return;
  await addSubscription({
    ipoId,
    category: String(formData.get("category") ?? "overall") as
      | "retail"
      | "hni"
      | "qib"
      | "employee"
      | "overall",
    timesSubscribed: times,
  });
  revalidatePath("/ipos");
  revalidatePath("/admin");
}

export async function saveGmp(ipoId: number, formData: FormData): Promise<void> {
  await addGmpSnapshot({
    ipoId,
    gmpValue: numOrNull(formData.get("gmpValue")),
    gmpPct: numOrNull(formData.get("gmpPct")),
  });
  revalidatePath("/ipos");
  revalidatePath("/admin");
}

export async function saveScraperUrls(ipoId: number, formData: FormData): Promise<void> {
  await updateIpoScraperUrls({
    ipoId,
    chittorgarhUrl: strOrNull(formData.get("chittorgarhUrl")),
    investorgainUrl: strOrNull(formData.get("investorgainUrl")),
  });
  revalidatePath("/ipos");
  revalidatePath("/admin");
}

export async function addPeerCompany(ipoId: number, formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sector = strOrNull(formData.get("sector"));
  const company = await upsertCompany({ name, sector });
  await addPeer(ipoId, company.id);
  revalidatePath("/ipos");
  revalidatePath("/admin");
}

export async function removePeerCompany(ipoId: number, formData: FormData): Promise<void> {
  const peerCompanyId = numOrNull(formData.get("peerCompanyId"));
  if (peerCompanyId === null) return;
  await removePeer(ipoId, peerCompanyId);
  revalidatePath("/ipos");
  revalidatePath("/admin");
}
