import left from 'main/lib/left';
import right from 'main/lib/right';

export const apple = 'shared-juice';
export default function getApple() {
	return [apple,left(),right()].join(' ⚪️  ');
}