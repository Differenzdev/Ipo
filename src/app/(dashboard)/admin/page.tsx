import Link from "next/link";
import { getAllCompanies } from "@/lib/db/queries";
import { saveIpo } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const companies = await getAllCompanies();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Add / update an IPO</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enter details manually for now. Fundamentals, subscription and GMP entries are added on the
          company&apos;s own page after you save this form.
        </p>
      </div>

      <form action={saveIpo} className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-6">
        <Field label="Company name" name="name" required className="col-span-2" />
        <Field label="Sector" name="sector" />
        <SelectField
          label="Status"
          name="status"
          defaultValue="upcoming"
          options={["upcoming", "open", "closed", "listed"]}
        />
        <Field label="Price band low (Rs.)" name="priceBandLow" type="number" step="0.01" />
        <Field label="Price band high (Rs.)" name="priceBandHigh" type="number" step="0.01" />
        <Field label="Lot size (shares)" name="lotSize" type="number" />
        <Field label="Issue size (Rs. crores)" name="issueSizeCrores" type="number" step="0.01" />
        <Field label="Open date" name="openDate" type="date" />
        <Field label="Close date" name="closeDate" type="date" />
        <Field label="Listing date" name="listingDate" type="date" />

        <div className="col-span-2 pt-2">
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Save IPO
          </button>
        </div>
      </form>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Existing companies</h2>
        <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {companies.length === 0 && <li className="px-4 py-3 text-sm text-neutral-500">None yet.</li>}
          {companies.map((c) => (
            <li key={c.id} className="px-4 py-3 text-sm">
              <Link href={`/admin/${c.slug}`} className="text-neutral-900 hover:underline">
                {c.name}
              </Link>
              {c.sector && <span className="ml-2 text-neutral-400">{c.sector}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  step,
  required,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`text-sm text-neutral-700 ${className ?? ""}`}>
      {label}
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="text-sm text-neutral-700">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
