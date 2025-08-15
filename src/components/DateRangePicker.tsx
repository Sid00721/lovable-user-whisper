import React, { useState } from 'react'
import { Calendar, CalendarDays, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export interface DateRange {
  from: Date
  to: Date
}

export interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

const quickFilters = [
  {
    label: 'Today',
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Yesterday',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'This month',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'Last month',
    getValue: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
]

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({})

  const handleQuickFilter = (filter: typeof quickFilters[0]) => {
    const range = filter.getValue()
    onChange(range)
    setIsOpen(false)
  }

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onChange({
        from: startOfDay(range.from),
        to: endOfDay(range.to),
      })
      setIsOpen(false)
      setTempRange({})
    } else {
      setTempRange(range || {})
    }
  }

  const formatDateRange = (range: DateRange) => {
    const fromStr = format(range.from, 'MMM d')
    const toStr = format(range.to, 'MMM d, yyyy')
    
    if (format(range.from, 'yyyy') === format(range.to, 'yyyy')) {
      if (format(range.from, 'MMM d') === format(range.to, 'MMM d')) {
        return format(range.from, 'MMM d, yyyy')
      }
      return `${fromStr} - ${toStr}`
    }
    
    return `${format(range.from, 'MMM d, yyyy')} - ${toStr}`
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Quick Filter Buttons */}
      <div className="hidden md:flex items-center gap-1">
        {quickFilters.slice(0, 4).map((filter) => {
          const filterRange = filter.getValue()
          const isActive = 
            format(value.from, 'yyyy-MM-dd') === format(filterRange.from, 'yyyy-MM-dd') &&
            format(value.to, 'yyyy-MM-dd') === format(filterRange.to, 'yyyy-MM-dd')
          
          return (
            <Button
              key={filter.label}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickFilter(filter)}
              className="text-xs"
            >
              {filter.label}
            </Button>
          )
        })}
      </div>

      {/* Custom Date Range Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal min-w-[200px]',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {value ? formatDateRange(value) : 'Pick a date range'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex">
            {/* Quick Filters Sidebar */}
            <div className="border-r p-3 space-y-1 min-w-[120px]">
              <div className="text-sm font-medium mb-2">Quick filters</div>
              {quickFilters.map((filter) => {
                const filterRange = filter.getValue()
                const isActive = 
                  format(value.from, 'yyyy-MM-dd') === format(filterRange.from, 'yyyy-MM-dd') &&
                  format(value.to, 'yyyy-MM-dd') === format(filterRange.to, 'yyyy-MM-dd')
                
                return (
                  <Button
                    key={filter.label}
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleQuickFilter(filter)}
                    className="w-full justify-start text-xs"
                  >
                    {filter.label}
                  </Button>
                )
              })}
            </div>
            
            {/* Calendar */}
            <div className="p-3">
              <CalendarComponent
                mode="range"
                defaultMonth={value.from}
                selected={{ from: tempRange.from || value.from, to: tempRange.to || value.to }}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                className="rounded-md"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Live Indicator */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span>Live</span>
      </div>
    </div>
  )
}

export default DateRangePicker