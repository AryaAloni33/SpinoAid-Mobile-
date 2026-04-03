import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  header: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface MedicalTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  onRowClick?: (item: T) => void;
}

export function MedicalTable<T extends Record<string, unknown>>({
  columns,
  data,
  className,
  onRowClick,
}: MedicalTableProps<T>) {
  return (
    <div className={cn("w-full overflow-auto", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(item)}
              className={cn(
                "transition-colors duration-150",
                "hover:bg-muted/50",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className={cn(
                    "px-4 py-3.5 text-sm text-foreground",
                    column.className
                  )}
                >
                  {column.render
                    ? column.render(item)
                    : String(item[column.key as keyof T] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No data available
        </div>
      )}
    </div>
  );
}
