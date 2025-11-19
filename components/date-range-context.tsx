'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getRangeForPreset } from "@/lib/dateRange";

type DateRange = {
  from: string;
  to: string;
};

type DateRangeContextValue = {
  range: DateRange;
  setRange: (range: DateRange) => void;
};

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

const defaultRange = getRangeForPreset("this_month");

export const DateRangeProvider = ({ children }: { children: ReactNode }) => {
  const [range, setRange] = useState<DateRange>(defaultRange);

  const value = useMemo(
    () => ({
      range,
      setRange,
    }),
    [range],
  );

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
};

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error("useDateRange must be used within DateRangeProvider");
  }
  return context;
};
