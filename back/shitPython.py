class Solution(object):
    def addBinary(self, a, b):
        """
        :type a: str
        :type b: str
        :rtype: str
        """
        result = []
        index_a = len(a) - 1
        index_b = len(b) - 1
        carry = 0

        while index_a >= 0 or index_b >= 0 or carry:
            if index_a >= 0:
                carry += int(a[index_a])
                index_a -= 1

            if index_b >= 0:
                carry += int(b[index_b])
                index_b -= 1

            result.append(str(carry % 2))
            carry = carry // 2

        return "".join(result[::-1])




sol = Solution()
print(sol.addBinary('11','1'))

def get_expected_cost(beds, baths, has_basement):
    value = beds * 30000 + baths * 10000 + 0 if has_basement else 40000 + 80000
    return value

# Check your answer
print(get_expected_cost(1,1, True))