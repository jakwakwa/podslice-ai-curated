"use client"


import Link from "next/link"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs"

export function DynamicBreadcrumb() {
	const breadcrumbs = useBreadcrumbs()

	if (breadcrumbs.length === 0) {
		return null
	}

	return (
		<Breadcrumb className="w-full">

			<BreadcrumbList className="w-full text-left mx-0 flex flex-row  items-center gap-1">

				{breadcrumbs.map((breadcrumb, index) => (
					<div key={breadcrumb.href} className="contents">
						<BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
							{breadcrumb.isCurrentPage ? (
								<BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
							) : (
								<BreadcrumbLink asChild>
									<Link href={breadcrumb.href}>{breadcrumb.label}</Link>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
						{index < breadcrumbs.length - 1 && <BreadcrumbSeparator className={index === 0 ? "hidden md:block" : ""} />}
					</div>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	)
}
