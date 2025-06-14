<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { AuthService, user } from '$lib/services/authService';
	import { Menu, X, Truck, Users, Settings, BookOpen, CreditCard, LogOut } from 'lucide-svelte';
	import OnboardingWizard from '$lib/components/onboarding/OnboardingWizard.svelte';

	let sidebarOpen = false;

	onMount(async () => {
		await AuthService.initializeAuth();

		if (!$user) {
			await goto('/login');
		}
	});

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	async function handleLogout() {
		await AuthService.logout();
	}

	$: currentPath = $page.url.pathname;

	const navigationItems = [
		{ name: 'Dashboard', href: '/dashboard', icon: BookOpen },
		{ name: 'Services', href: '/services', icon: Settings },
		{ name: 'Drivers', href: '/drivers', icon: Users },
		{ name: 'Vehicles', href: '/vehicles', icon: Truck },
		{ name: 'Logbook', href: '/logbook', icon: BookOpen },
		{ name: 'Billing', href: '/billing', icon: CreditCard }
	];
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Mobile sidebar -->
	{#if sidebarOpen}
		<div class="fixed inset-0 z-40 lg:hidden">
			<div
				class="fixed inset-0 bg-gray-600 bg-opacity-75"
				on:click={toggleSidebar}
				on:keydown={toggleSidebar}
				role="button"
				tabindex="0"
				aria-label="Close sidebar"
			></div>
			<div class="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
				<div class="flex h-16 flex-shrink-0 items-center justify-between px-4 border-b">
					<h1 class="text-xl font-semibold">Mitra Portal</h1>
					<button type="button" on:click={toggleSidebar}>
						<X class="h-6 w-6 text-gray-400" />
					</button>
				</div>
				<nav class="flex-1 space-y-1 px-2 py-4">
					{#each navigationItems as item}
						<a
							href={item.href}
							class="group flex items-center px-2 py-2 text-sm font-medium rounded-md {currentPath ===
							item.href
								? 'bg-blue-100 text-blue-900'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
						>
							<svelte:component this={item.icon} class="mr-3 h-5 w-5" />
							{item.name}
						</a>
					{/each}
				</nav>
			</div>
		</div>
	{/if}

	<!-- Desktop sidebar -->
	<div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
		<div class="flex grow flex-col bg-white border-r border-gray-200">
			<div class="flex h-16 flex-shrink-0 items-center px-4 border-b">
				<h1 class="text-xl font-semibold">Mitra Portal</h1>
			</div>
			<nav class="flex-1 space-y-1 px-2 py-4">
				{#each navigationItems as item}
					<a
						href={item.href}
						class="group flex items-center px-2 py-2 text-sm font-medium rounded-md {currentPath ===
						item.href
							? 'bg-blue-100 text-blue-900'
							: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
					>
						<svelte:component this={item.icon} class="mr-3 h-5 w-5" />
						{item.name}
					</a>
				{/each}
			</nav>
		</div>
	</div>

	<!-- Main content -->
	<div class="lg:pl-64">
		<!-- Top bar -->
		<div class="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
			<div class="flex h-16 items-center gap-x-4 px-4 sm:gap-x-6 sm:px-6 lg:px-8">
				<button type="button" class="-m-2.5 p-2.5 text-gray-700 lg:hidden" on:click={toggleSidebar}>
					<Menu class="h-6 w-6" />
				</button>

				<div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
					<div class="flex flex-1"></div>
					<div class="flex items-center gap-x-4 lg:gap-x-6">
						{#if $user}
							<div class="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200"></div>
							<div class="flex items-center gap-x-2">
								<img
									class="h-8 w-8 rounded-full"
									src={$user.user.avatarUrl || '/default-avatar.png'}
									alt={$user.user.name}
								/>
								<span class="hidden lg:block text-sm font-medium">{$user.user.name}</span>
								<button
									type="button"
									on:click={handleLogout}
									class="rounded-md p-1 text-gray-400 hover:text-gray-500"
									title="Logout"
								>
									<LogOut class="h-5 w-5" />
								</button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Page content -->
		<main class="py-8">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<slot />
			</div>
		</main>
	</div>
</div>

<!-- Onboarding Wizard -->
{#if $user && $user.roles.isMitra}
	<OnboardingWizard
		userProfile={$user}
		on:complete={() => {
			// Refresh user data to get updated onboarding status
			AuthService.initializeAuth();
		}}
	/>
{/if}
