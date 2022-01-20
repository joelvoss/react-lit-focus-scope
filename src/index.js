import * as React from 'react';
import {
	useIsomorphicLayoutEffect as useLayoutEffect,
	focusWithoutScrolling,
} from '@react-lit/helper';

////////////////////////////////////////////////////////////////////////////////

/** @type {RefObject<HTMLElement[]>} */
let activeScope = null;

/** @type {Set<RefObject<HTMLElement[]>>} */
let scopes = new Set();

/**
 * @typedef {Object} FocusLockProps
 * @prop {ReactNode} children
 * @prop {boolean} [contain]
 * @prop {boolean} [restoreFocus]
 * @prop {boolean} [autoFocus]
 */

/**
 * @param {FocusLockProps} props
 */
export function FocusScope(props) {
	let {
		children,
		contain = true,
		restoreFocus = true,
		autoFocus = true,
		initialFocusRef,
	} = props;
	let startRef = React.useRef();
	let endRef = React.useRef();
	let scopeRef = React.useRef([]);

	// NOTE(joel): Find all rendered nodes between the sentinels and add them to
	// the scope.
	useLayoutEffect(() => {
		let node = startRef.current.nextSibling;
		let nodes = [];
		while (node && node !== endRef.current) {
			nodes.push(node);
			node = node.nextSibling;
		}

		scopeRef.current = nodes;
		scopes.add(scopeRef);
		return () => {
			scopes.delete(scopeRef);
		};
	}, [children]);

	useFocusContainment(scopeRef, contain);
	useRestoreFocus(scopeRef, restoreFocus, contain);
	useAutoFocus(scopeRef, autoFocus, initialFocusRef);

	return (
		<>
			<span hidden ref={startRef} />
			{children}
			<span hidden ref={endRef} />
		</>
	);
}

////////////////////////////////////////////////////////////////////////////////

/**
 * useFocusContainment
 * @param {RefObject<HTMLElement[]>} scopeRef
 * @param {boolean} contain
 */
function useFocusContainment(scopeRef, contain) {
	let focusedNode = React.useRef();

	let raf = React.useRef(null);
	React.useEffect(() => {
		let scope = scopeRef.current;
		if (!contain) return;

		/**
		 * Handle the Tab key to contain focus within the scope
		 * @param {React.KeyboardEvent} e
		 */
		function onKeyDown(e) {
			if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) {
				return;
			}

			const focusedElement = document.activeElement;
			if (!isElementInScope(focusedElement, scope)) {
				return;
			}

			const walker = getFocusableTreeWalker(
				getScopeRoot(scope),
				{ tabbable: true },
				scope,
			);
			walker.currentNode = focusedElement;

			let nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
			if (!nextElement) {
				walker.currentNode = e.shiftKey
					? scope[scope.length - 1].nextElementSibling
					: scope[0].previousElementSibling;
				nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
			}

			e.preventDefault();
			if (nextElement) {
				focusElement(nextElement, true);
			}
		}

		/**
		 * onFocus
		 * If a focus event occurs outside the active scope (e.g. user tabs from
		 * browser location bar), restore focus to the previously focused node or
		 * the first tabbable element in the active scope.
		 * @param {React.FocusEvent} e
		 */
		function onFocus(e) {
			const isInAnyScope = isElementInAnyScope(e.target, scopes);

			if (!isInAnyScope) {
				if (focusedNode.current) {
					focusedNode.current.focus();
				} else if (activeScope) {
					focusFirstInScope(activeScope.current);
				}
			} else {
				activeScope = scopeRef;
				focusedNode.current = e.target;
			}
		}

		/**
		 * onBlur
		 * @param {React.FocusEvent} e
		 */
		function onBlur(e) {
			// Firefox doesn't shift focus back to the Dialog properly without this
			raf.current = window.requestAnimationFrame(() => {
				// Use document.activeElement instead of e.relatedTarget so we can tell if user clicked into iframe
				let isInAnyScope = isElementInAnyScope(document.activeElement, scopes);

				if (!isInAnyScope) {
					activeScope = scopeRef;
					focusedNode.current = e.target;
					focusedNode.current.focus();
				}
			});
		}

		document.addEventListener('keydown', onKeyDown, false);
		document.addEventListener('focusin', onFocus, false);
		scope.forEach(element =>
			element.addEventListener('focusin', onFocus, false),
		);
		scope.forEach(element =>
			element.addEventListener('focusout', onBlur, false),
		);
		return () => {
			document.removeEventListener('keydown', onKeyDown, false);
			document.removeEventListener('focusin', onFocus, false);
			scope.forEach(element =>
				element.removeEventListener('focusin', onFocus, false),
			);
			scope.forEach(element =>
				element.removeEventListener('focusout', onBlur, false),
			);
		};
	}, [scopeRef, contain]);

	// NOTE(joel): Cancel the current RequestAnimationFrame
	React.useEffect(() => () => window.cancelAnimationFrame(raf.current), [raf]);
}

////////////////////////////////////////////////////////////////////////////////

/**
 * isElementInAnyScope
 * @param {Element} element
 * @param {Set<RefObject<HTMLElement[]>>} scopes
 */
function isElementInAnyScope(element, scopes) {
	for (let scope of scopes.values()) {
		if (isElementInScope(element, scope.current)) {
			return true;
		}
	}
	return false;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * isElementInScope
 * @param {Element} element
 * @param {HTMLElement[]} scope
 */
function isElementInScope(element, scope) {
	return scope.some(node => node.contains(element));
}

////////////////////////////////////////////////////////////////////////////////

const focusableElements = [
	'input:not([disabled]):not([type=hidden])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'button:not([disabled])',
	'a[href]',
	'area[href]',
	'summary',
	'iframe',
	'object',
	'embed',
	'audio[controls]',
	'video[controls]',
	'[contenteditable]',
];

const FOCUSABLE_ELEMENT_SELECTOR =
	focusableElements.join(':not([hidden]),') +
	',[tabindex]:not([disabled]):not([hidden])';

focusableElements.push('[tabindex]:not([tabindex="-1"]):not([disabled])');

const TABBABLE_ELEMENT_SELECTOR = focusableElements.join(
	':not([hidden]):not([tabindex="-1"]),',
);

////////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {Object} FocusManagerOptions
 * @prop {HTMLElement} [from]
 * @prop {boolean} [tabbable]
 * @prop {boolean} [wrap]
 */

/**
 * getFocusableTreeWalker creates a TreeWalker that matches all
 * focusable/tabbable elements.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker
 * @param {FocusManagerOptions} [opts]
 * @param {HTMLElement} root
 * @param {HTMLElement[]} [scope]
 * @returns {TreeWalker}
 */
export function getFocusableTreeWalker(root, opts, scope) {
	let selector = opts?.tabbable
		? TABBABLE_ELEMENT_SELECTOR
		: FOCUSABLE_ELEMENT_SELECTOR;
	let walker = document.createTreeWalker(root, window.NodeFilter.SHOW_ELEMENT, {
		acceptNode(node) {
			// NOTE(joel): Skip nodes inside the starting node.
			if (opts?.from?.contains(node)) {
				return window.NodeFilter.FILTER_REJECT;
			}

			if (
				node.matches(selector) &&
				isElementVisible(node) &&
				(!scope || isElementInScope(node, scope))
			) {
				return window.NodeFilter.FILTER_ACCEPT;
			}

			return window.NodeFilter.FILTER_SKIP;
		},
	});

	if (opts?.from) {
		walker.currentNode = opts.from;
	}

	return walker;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * isStyleVisible tests if a given `element`s style indicates a "visible" state.
 * @param {Element} element
 */
function isStyleVisible(element) {
	if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
		return false;
	}

	let { display, visibility } = element.style;

	let isVisible =
		display !== 'none' && visibility !== 'hidden' && visibility !== 'collapse';

	if (isVisible) {
		const { getComputedStyle } = element.ownerDocument.defaultView;
		let { display: computedDisplay, visibility: computedVisibility } =
			getComputedStyle(element);

		isVisible =
			computedDisplay !== 'none' &&
			computedVisibility !== 'hidden' &&
			computedVisibility !== 'collapse';
	}

	return isVisible;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * isAttributeVisible tests if a given `element`s attributes indicate a
 * "visible" state.
 * @param {Element} element
 * @param {Element} [childElement]
 */
function isAttributeVisible(element, childElement) {
	return (
		!element.hasAttribute('hidden') &&
		(element.nodeName === 'DETAILS' &&
		childElement &&
		childElement.nodeName !== 'SUMMARY'
			? element.hasAttribute('open')
			: true)
	);
}

////////////////////////////////////////////////////////////////////////////////

/**
 * isElementVisible tests if a given `element` indicates a "visible" state.
 * @param {Element} element
 * @param {Element} [childElement]
 */
export function isElementVisible(element, childElement) {
	return (
		element.nodeName !== '#comment' &&
		isStyleVisible(element) &&
		isAttributeVisible(element, childElement) &&
		(!element.parentElement || isElementVisible(element.parentElement, element))
	);
}

////////////////////////////////////////////////////////////////////////////////

/**
 * getScopeRoot returns the `parentElement` of the first scope `HTMLElement`.
 * @param {HTMLElement[]} scope
 */
function getScopeRoot(scope) {
	return scope[0].parentElement;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * focusElement
 * @param {HTMLElement | null} element
 * @param {boolean} [scroll=false]
 */
function focusElement(element, scroll = false) {
	if (element != null && !scroll) {
		try {
			focusWithoutScrolling(element);
		} catch (err) {
			// silence is golden
		}
	} else if (element != null) {
		try {
			element.focus();
		} catch (err) {
			// silence is golden
		}
	}
}

////////////////////////////////////////////////////////////////////////////////

/**
 * focusFirstInScope
 * @param {HTMLElement[]} scope
 */
function focusFirstInScope(scope) {
	const sentinel = scope[0].previousElementSibling;
	const walker = getFocusableTreeWalker(
		getScopeRoot(scope),
		{ tabbable: true },
		scope,
	);
	walker.currentNode = sentinel;
	focusElement(walker.nextNode());
}

////////////////////////////////////////////////////////////////////////////////

/**
 * useRestoreFocus
 * @param {RefObject<HTMLElement[]>} scopeRef
 * @param {boolean} restoreFocus
 * @param {boolean} contain
 */
function useRestoreFocus(scopeRef, restoreFocus, contain) {
	// NOTE(joel): We use `useLayoutEffect` instead of `React.useEffect` so the active
	// element is saved synchronously instead of asynchronously.
	useLayoutEffect(() => {
		const scope = scopeRef.current;
		let nodeToRestore = document.activeElement;

		/**
		 * Handle the Tab key so that tabbing out of the scope goes to the next
		 * element after the node that had focus when the scope mounted. This is
		 * important when using portals for overlays, so that focus goes to the
		 * expected element when tabbing out of the overlay.
		 * @param {KeyboardEvent} evt
		 */
		function onKeyDown(evt) {
			if (evt.key !== 'Tab' || evt.altKey || evt.ctrlKey || evt.metaKey) {
				return;
			}

			const focusedElement = document.activeElement;
			if (!isElementInScope(focusedElement, scope)) return;

			// NOTE(joel): Create a DOM tree walker that matches all tabbable
			// elements.
			const walker = getFocusableTreeWalker(document.body, { tabbable: true });

			// NOTE(joel): Find the next tabbable element after the currently focused
			// element
			walker.currentNode = focusedElement;
			let nextElement = evt.shiftKey
				? walker.previousNode()
				: walker.nextNode();

			if (
				!document.body.contains(nodeToRestore) ||
				nodeToRestore === document.body
			) {
				nodeToRestore = null;
			}

			// NOTE(joel): If there is no next element, or it is outside the current
			// scope, move focus to the next element after the node to restore to
			// instead.
			if (
				(!nextElement || !isElementInScope(nextElement, scope)) &&
				nodeToRestore
			) {
				walker.currentNode = nodeToRestore;

				// NOTE(joel): Skip over elements within the scope, in case the scope
				// immediately follows the node to restore.
				do {
					nextElement = evt.shiftKey
						? walker.previousNode()
						: walker.nextNode();
				} while (isElementInScope(nextElement, scope));

				evt.preventDefault();
				evt.stopPropagation();
				if (nextElement) {
					focusElement(nextElement, true);
				} else {
					// NOTE(joel): If there is no next element, blur the focused element
					// to move focus to the body.
					focusedElement.blur();
				}
			}
		}

		if (!contain) {
			document.addEventListener('keydown', onKeyDown, true);
		}

		return () => {
			if (!contain) {
				document.removeEventListener('keydown', onKeyDown, true);
			}

			if (
				restoreFocus &&
				nodeToRestore &&
				isElementInScope(document.activeElement, scope)
			) {
				window.requestAnimationFrame(() => {
					if (document.body.contains(nodeToRestore)) {
						focusElement(nodeToRestore);
					}
				});
			}
		};
	}, [scopeRef, restoreFocus, contain]);
}

////////////////////////////////////////////////////////////////////////////////

/**
 * useAutoFocus automatically focuses the first element referenced by
 * `scopeRef`.
 * @param {RefObject<HTMLElement[]>} scopeRef
 * @param {boolean} autoFocus
 * @param {RefObject<any>} initialFocusRef
 */
function useAutoFocus(scopeRef, autoFocus, initialFocusRef) {
	React.useEffect(() => {
		if (autoFocus && initialFocusRef == null) {
			activeScope = scopeRef;
			if (!isElementInScope(document.activeElement, activeScope.current)) {
				focusFirstInScope(scopeRef.current);
			}
		}

		if (initialFocusRef != null && initialFocusRef.current != null) {
			activeScope = scopeRef;
			if (!isElementInScope(document.activeElement, activeScope.current)) {
				focusElement(initialFocusRef.current);
			}
		}
	}, [scopeRef, autoFocus, initialFocusRef]);
}
