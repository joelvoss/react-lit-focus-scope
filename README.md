# @react-lit/focus-scope

FocusScope manages focus for its descendants. It supports containing focus inside
the scope, restoring focus to the previously focused element on unmount, and
auto focusing children on mount.

## Installation

```bash
$ npm i @react-lit/focus-scope
# or
$ yarn add @react-lit/focus-scope
```

## Example

```js
import * as React from 'react',
import { FocusScope } from '@react-lit/focus-scope';

function Example() {
  const [isOpen, setOpen] = useState(false);
	return (
		<>
			<button onClick={() => setOpen(true)}>Open</button>
			{isOpen && (
				<FocusScope>
					<input aria-label="First input" placeholder="First input" />
					<input aria-label="Second input" placeholder="Second input" />
					<button onClick={() => setOpen(false)}>Close</button>
				</FocusScope>
			)}
		</>
	);
}
```

## Development

(1) Install dependencies

```bash
$ npm i
# or
$ yarn
```

(2) Run initial validation

```bash
$ ./Taskfile.sh validate
```

(3) Run tests in watch-mode to validate functionality.

```bash
$ ./Taskfile test -w
```

---

_This project was set up by @jvdx/core_
