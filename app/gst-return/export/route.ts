'use server';

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isCategoryIncludedInGst } from "@/lib/categories";
import { calculateGstFromGross } from "@/lib/utils";

const formatNumber = (value: number) => value.toFixed(2);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from, to, access_token, refresh_token } = body ?? {};

    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to are required" },
        { status: 400 },
      );
    }

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sessionError) {
      return NextResponse.json(
        { error: "Failed to authenticate" },
        { status: 401 },
      );
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData.user.id;

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", userId)
      .gte("date", from)
      .lte("date", to)
      .is("deleted_at", null)
      .order("date", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load expenses", details: error.message },
        { status: 500 },
      );
    }

    const filtered = (data ?? []).filter((row) =>
      isCategoryIncludedInGst(row.category),
    );

    const csvRows: string[] = [
      ["Date", "Category", "Description", "Amount", "GstIncluded", "GstPortion", "Type"].join(","),
    ];

    filtered.forEach((row) => {
      const amount = Math.abs(Number(row.amount ?? 0));
      const gstIncluded = Boolean(row.gst_included);
      const gstPortion = gstIncluded ? calculateGstFromGross(amount) : 0;
      csvRows.push(
        [
          row.date,
          `"${String(row.category ?? "").replace(/"/g, '""')}"`,
          `"${String(row.description ?? "").replace(/"/g, '""')}"`,
          formatNumber(amount),
          gstIncluded ? "Yes" : "No",
          formatNumber(gstPortion),
          row.type ?? "expense",
        ].join(","),
      );
    });

    const filename = `gst-return-${String(from).replace(/-/g, "")}-${String(to).replace(/-/g, "")}.csv`;
    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GST export failed", error);
    return NextResponse.json(
      { error: "Failed to export GST CSV" },
      { status: 500 },
    );
  }
}
