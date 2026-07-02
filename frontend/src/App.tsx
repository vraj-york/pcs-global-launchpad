import { Route, Routes } from "react-router-dom";
import { AuthProvider, PostHogAnalytics } from "@/components/common";
import { routes } from "@/routes";

export function App() {
	return (
		<AuthProvider>
			<PostHogAnalytics />
			<Routes>
				{routes.map((route) => (
					<Route key={route.path} path={route.path} element={route.element}>
						{route.children?.map((child) => (
							<Route
								key={child.path}
								path={child.path}
								element={child.element}
							/>
						))}
					</Route>
				))}
			</Routes>
		</AuthProvider>
	);
}

export default App;
