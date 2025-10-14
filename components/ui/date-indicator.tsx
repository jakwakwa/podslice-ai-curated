import { differenceInCalendarDays } from "date-fns"
import type React from "react"

interface DateIndicatorProps {
	indicator: Date | string
	label: string | null
	size?: "xs" | "sm"
}

function DateIndicator({ indicator, label, size = "sm" }: DateIndicatorProps): React.ReactElement {
	const getTimeAgoInDays = (date: Date | string): string => {
		if (!date) return "Unknown"

		try {
			// If it's already a Date object, use it directly. Otherwise, convert.
			const dateObject = date instanceof Date ? date : new Date(date)

			// Check if the date is valid
			// biome-ignore lint/suspicious/noGlobalIsNan: <suppressed>
			if (isNaN(dateObject.getTime())) {
				return "Invalid date"
			}

			const now = new Date()
			const daysDifference = differenceInCalendarDays(now, dateObject)

			if (daysDifference < 0) {
				const daysInFuture = Math.abs(daysDifference)
				return `in ${daysInFuture} ${daysInFuture === 1 ? "day" : "days"}`
			}
			if (daysDifference === 0) {
				return "Today"
			}
			return `${daysDifference} ${daysDifference === 1 ? "day" : "days"} ago`
		} catch (error) {
			console.warn("Failed to format date:", error)
			return "Invalid date"
		}
	}

	const sizeClasses = {
		xs: "text-[0.5rem]",
		sm: "text-[0.4rem]",
	}
	if (!label) {
		return (
			<div className={`flex py-0 pl-1 h-auto leading-none font-normal mr-1 ${sizeClasses[size]} no-wrap font-mono text-primary-foreground   text-[0.55rem]`}>
				{getTimeAgoInDays(indicator)}
			</div>
		)
	}
	return (
		<div className={`w-full px-1 text-center inline py-0 mr-1  text-primary-foreground shadow-md h-auto tracking-tighter leading-none ${sizeClasses[size]} font-mono no-wrap `}>
			{label}: {getTimeAgoInDays(indicator)}
		</div>
	)
}

export default DateIndicator
