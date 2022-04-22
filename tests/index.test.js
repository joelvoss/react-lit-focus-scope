import * as React from 'react';
import { act, render, fireEvent, userEvent } from './test-utils';

import { FocusScope } from '../src/index';

describe('<FocusScope />', () => {
	beforeEach(() => {
		jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb());
	});

	afterEach(() => {
		window.requestAnimationFrame.mockRestore();
	});

	it('should not have ARIA violations', async () => {
		const { container } = render(
			<FocusScope>
				<label htmlFor="input">Label</label>
				<input id="input" data-testid="input1" />
			</FocusScope>,
		);
		await expect(container).toHaveNoAxeViolations();
	});

	it(`should render focus guards before and after it's children`, async () => {
		const { container } = render(
			<FocusScope>
				<input data-testid="input1" />
			</FocusScope>,
		);

		expect(container.innerHTML).toBe(
			'<span hidden=""></span><input data-testid="input1"><span hidden=""></span>',
		);
	});

	it('should autofocus on mount', async () => {
		const { getByTestId } = render(
			<FocusScope>
				<input data-testid="input1" />
			</FocusScope>,
		);
		let input1 = getByTestId('input1');

		expect(document.activeElement).toBe(input1);
	});

	it('should contain focus within the scope', async () => {
		const { getByTestId } = render(
			<FocusScope>
				<input data-testid="input1" />
				<input data-testid="input2" />
				<input data-testid="input3" />
			</FocusScope>,
		);

		const input1 = getByTestId('input1');
		const input2 = getByTestId('input2');
		const input3 = getByTestId('input3');

		act(() => {
			input1.focus();
		});
		expect(document.activeElement).toBe(input1);

		await userEvent.tab();
		expect(document.activeElement).toBe(input2);

		await userEvent.tab();
		expect(document.activeElement).toBe(input3);

		await userEvent.tab();
		expect(document.activeElement).toBe(input1);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input3);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input2);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input1);
	});

	it('should work with nested elements', async () => {
		const { getByTestId } = render(
			<FocusScope>
				<input data-testid="input1" />
				<div>
					<input data-testid="input2" />
					<div>
						<input data-testid="input3" />
					</div>
				</div>
			</FocusScope>,
		);

		const input1 = getByTestId('input1');
		const input2 = getByTestId('input2');
		const input3 = getByTestId('input3');

		act(() => {
			input1.focus();
		});
		expect(document.activeElement).toBe(input1);

		await userEvent.tab();
		expect(document.activeElement).toBe(input2);

		await userEvent.tab();
		expect(document.activeElement).toBe(input3);

		await userEvent.tab();
		expect(document.activeElement).toBe(input1);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input3);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input2);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input1);
	});

	it('should skip non-tabbable elements', async () => {
		const { getByTestId } = render(
			<FocusScope>
				<input data-testid="input1" />
				<div />
				<input data-testid="input2" />
				<input data-testid="hiddenInput1" hidden />
				<input style={{ display: 'none' }} />
				<input style={{ visibility: 'hidden' }} />
				<input style={{ visibility: 'collapse' }} />
				<div tabIndex={-1} />
				<input disabled tabIndex={0} />
				<input data-testid="input3" />
			</FocusScope>,
		);

		const input1 = getByTestId('input1');
		const input2 = getByTestId('input2');
		const input3 = getByTestId('input3');

		act(() => {
			input1.focus();
		});
		expect(document.activeElement).toBe(input1);

		await userEvent.tab();
		expect(document.activeElement).toBe(input2);

		await userEvent.tab();
		expect(document.activeElement).toBe(input3);

		await userEvent.tab();
		expect(document.activeElement).toBe(input1);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input3);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input2);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input1);
	});

	it('should do nothing if a modifier key is pressed', async () => {
		const { getByTestId } = render(
			<FocusScope>
				<input data-testid="input1" />
				<input data-testid="input2" />
				<input data-testid="input3" />
			</FocusScope>,
		);

		const input1 = getByTestId('input1');

		act(() => {
			input1.focus();
		});
		expect(document.activeElement).toBe(input1);

		fireEvent.keyDown(document.activeElement, { key: 'Tab', altKey: true });
		expect(document.activeElement).toBe(input1);
	});

	it('should work with multiple focus scopes', async () => {
		const { getByTestId } = render(
			<div>
				<FocusScope>
					<input data-testid="input1" />
					<input data-testid="input2" />
					<input style={{ display: 'none' }} />
					<input style={{ visibility: 'hidden' }} />
					<input style={{ visibility: 'collapse' }} />
					<input data-testid="input3" />
				</FocusScope>
				<FocusScope>
					<input data-testid="input4" />
					<input data-testid="input5" />
					<input style={{ display: 'none' }} />
					<input style={{ visibility: 'hidden' }} />
					<input style={{ visibility: 'collapse' }} />
					<input data-testid="input6" />
				</FocusScope>
			</div>,
		);

		const input1 = getByTestId('input1');
		const input2 = getByTestId('input2');
		const input3 = getByTestId('input3');
		const input4 = getByTestId('input4');
		const input5 = getByTestId('input5');
		const input6 = getByTestId('input6');

		act(() => {
			input1.focus();
		});
		expect(document.activeElement).toBe(input1);

		await userEvent.tab();
		expect(document.activeElement).toBe(input2);

		await userEvent.tab();
		expect(document.activeElement).toBe(input3);

		await userEvent.tab();
		expect(document.activeElement).toBe(input1);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input3);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input2);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input1);

		act(() => {
			input4.focus();
		});
		expect(document.activeElement).toBe(input4);

		await userEvent.tab();
		expect(document.activeElement).toBe(input5);

		await userEvent.tab();
		expect(document.activeElement).toBe(input6);

		await userEvent.tab();
		expect(document.activeElement).toBe(input4);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input6);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input5);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(input4);
	});

	it('should restore focus to the last focused element in the scope when re-entering the browser', async () => {
		const { getByTestId } = render(
			<div>
				<input data-testid="outside" />
				<FocusScope>
					<input data-testid="input1" />
					<input data-testid="input2" />
					<input data-testid="input3" />
				</FocusScope>
			</div>,
		);

		const input1 = getByTestId('input1');
		const input2 = getByTestId('input2');
		const outside = getByTestId('outside');

		act(() => {
			input1.focus();
		});
		// NOTE(joel): jsdom doesn't fire this automatically
		fireEvent.focusIn(input1);
		expect(document.activeElement).toBe(input1);

		await userEvent.tab();
		fireEvent.focusIn(input2);
		expect(document.activeElement).toBe(input2);

		act(() => {
			input2.blur();
		});
		expect(document.activeElement).toBe(input2);

		act(() => {
			outside.focus();
		});
		fireEvent.focusIn(outside);
		expect(document.activeElement).toBe(input2);
	});

	it('should restore focus to the last focused element in the scope on focus out', async () => {
		const { getByTestId } = render(
			<div>
				<FocusScope>
					<input data-testid="input1" />
					<input data-testid="input2" />
				</FocusScope>
			</div>,
		);

		const input1 = getByTestId('input1');
		const input2 = getByTestId('input2');

		act(() => {
			input1.focus();
		});
		fireEvent.focusIn(input1); // jsdom doesn't fire this automatically
		expect(document.activeElement).toBe(input1);

		await userEvent.tab();
		fireEvent.focusIn(input2);
		expect(document.activeElement).toBe(input2);

		act(() => {
			input2.blur();
		});
		expect(document.activeElement).toBe(input2);
		fireEvent.focusOut(input2);
		expect(document.activeElement).toBe(input2);
	});

	it('should use document.activeElement instead of e.relatedTarget on blur to determine if focus is still in scope', async () => {
		const { getByTestId } = render(
			<div>
				<FocusScope>
					<input data-testid="input1" />
					<input data-testid="input2" />
				</FocusScope>
			</div>,
		);

		const input1 = getByTestId('input1');
		const input2 = getByTestId('input2');

		act(() => {
			input1.focus();
		});
		fireEvent.focusIn(input1); // jsdom doesn't fire this automatically
		expect(document.activeElement).toBe(input1);

		act(() => {
			// set document.activeElement to input2
			input2.focus();
			// if onBlur didn't fallback to checking document.activeElement, this would reset focus to input1
			fireEvent.blur(input1, { relatedTarget: null });
		});

		expect(document.activeElement).toBe(input2);
	});

	it('should restore focus to the previously focused node on unmount', async () => {
		function Comp({ show }) {
			return (
				<div>
					<input data-testid="outside" />
					{show && (
						<FocusScope contain={false}>
							<input data-testid="input1" />
							<input data-testid="input2" />
							<input data-testid="input3" />
						</FocusScope>
					)}
				</div>
			);
		}

		const { getByTestId, rerender } = render(<Comp />);

		const outside = getByTestId('outside');
		act(() => {
			outside.focus();
		});

		expect(document.activeElement).toBe(outside);

		rerender(<Comp show />);

		expect(document.activeElement).toBe(getByTestId('input1'));

		rerender(<Comp />);

		expect(document.activeElement).toBe(outside);
	});

	it('should move focus to the next element after the previously focused node on Tab', async () => {
		function Comp({ show }) {
			return (
				<div>
					<input data-testid="before" />
					<button data-testid="trigger" />
					<input data-testid="after" />
					{show && (
						<FocusScope contain={false}>
							<input data-testid="input1" />
							<input data-testid="input2" />
							<input data-testid="input3" />
						</FocusScope>
					)}
				</div>
			);
		}

		let { getByTestId, rerender } = render(<Comp />);

		let trigger = getByTestId('trigger');
		act(() => {
			trigger.focus();
		});

		rerender(<Comp show />);

		let input1 = getByTestId('input1');
		expect(document.activeElement).toBe(input1);

		let input3 = getByTestId('input3');
		act(() => {
			input3.focus();
		});

		await userEvent.tab();
		expect(document.activeElement).toBe(getByTestId('after'));
	});

	it('should move focus to the previous element after the previously focused node on Shift+Tab', async () => {
		function Comp({ show }) {
			return (
				<div>
					<input data-testid="before" />
					<button data-testid="trigger" />
					<input data-testid="after" />
					{show && (
						<FocusScope contain={false}>
							<input data-testid="input1" />
							<input data-testid="input2" />
							<input data-testid="input3" />
						</FocusScope>
					)}
				</div>
			);
		}

		let { getByTestId, rerender } = render(<Comp />);

		let trigger = getByTestId('trigger');
		act(() => {
			trigger.focus();
		});

		rerender(<Comp show />);

		let input1 = getByTestId('input1');
		expect(document.activeElement).toBe(input1);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(getByTestId('before'));
	});

	it('should skip over elements within the scope when moving focus to the next element', async () => {
		function Comp({ show }) {
			return (
				<div>
					<input data-testid="before" />
					<button data-testid="trigger" />
					{show && (
						<FocusScope contain={false}>
							<input data-testid="input1" />
							<input data-testid="input2" />
							<input data-testid="input3" />
						</FocusScope>
					)}
					<input data-testid="after" />
				</div>
			);
		}

		let { getByTestId, rerender } = render(<Comp />);

		let trigger = getByTestId('trigger');
		act(() => {
			trigger.focus();
		});

		rerender(<Comp show />);

		let input1 = getByTestId('input1');
		expect(document.activeElement).toBe(input1);

		let input3 = getByTestId('input3');
		act(() => {
			input3.focus();
		});

		await userEvent.tab();
		expect(document.activeElement).toBe(getByTestId('after'));
	});

	it('should auto focus the first tabbable element in the scope on mount', async () => {
		let { getByTestId } = render(
			<FocusScope>
				<div />
				<input data-testid="input1" />
				<input data-testid="input2" />
				<input data-testid="input3" />
			</FocusScope>,
		);

		let input1 = getByTestId('input1');
		expect(document.activeElement).toBe(input1);
	});

	it('should do nothing if something is already focused in the scope', async () => {
		let { getByTestId } = render(
			<FocusScope>
				<div />
				<input data-testid="input1" />
				<input data-testid="input2" autoFocus />
				<input data-testid="input3" />
			</FocusScope>,
		);

		let input2 = getByTestId('input2');
		expect(document.activeElement).toBe(input2);
	});

	it('should auto focus the element passed via ref on mount', async () => {
		const Comp = () => {
			const initialFocusRef = React.useRef();
			return (
				<FocusScope initialFocusRef={initialFocusRef}>
					<div />
					<input data-testid="input1" />
					<input data-testid="input2" />
					<input data-testid="input3" ref={initialFocusRef} />
				</FocusScope>
			);
		};

		let { getByTestId } = render(<Comp />);

		let input3 = getByTestId('input3');
		expect(document.activeElement).toBe(input3);
	});
});
