import * as React from 'react';
import { FocusScope } from '../../src/index';

export function Example() {
	const [isOpen, setOpen] = React.useState(false);

	return (
		<>
			<h2>Example: Basic</h2>
			<div>
				<button>Before</button>
				<button onClick={() => setOpen(true)}>Open</button>
				{isOpen && (
					<FocusScope>
						<input aria-label="First input" placeholder="First input" />
						<input aria-label="Second input" placeholder="Second input" />
						<button onClick={() => setOpen(false)}>Close</button>
					</FocusScope>
				)}
				<button>After</button>
			</div>
		</>
	);
}
