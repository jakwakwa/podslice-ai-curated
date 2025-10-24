"use client";

import { Label } from "@radix-ui/react-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BundleType = "all" | "curated" | "shared";

interface EpisodesFilterBarProps {
  value: BundleType;
  onValueChange: (value: BundleType) => void;
  label: string;
  placeholder: string;
  options: {
    all: string;
    curated: string;
    shared: string;
  };
}

export function EpisodesFilterBar({
  value,
  onValueChange,
  label,
  placeholder,
  options,
}: EpisodesFilterBarProps) {
  const handleValueChange = (newValue: string) => {
    onValueChange(newValue as BundleType);
  };

  return (
    <div className="w-full flex flex-col items-start justify-start gap-2">
      <Label
        htmlFor="bundle-type-select"
        className="text-sm font-medium text-primary-foreground"
      >
        {label}
      </Label>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger id="bundle-type-select">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{options.all}</SelectItem>
          <SelectItem value="curated">{options.curated}</SelectItem>
          <SelectItem value="shared">{options.shared}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
